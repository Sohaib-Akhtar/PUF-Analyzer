import { spawn } from 'child_process';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { app } from 'electron';
import { 
  MetricsRequestDto, 
  StableRequestDto, 
  ExtractRequestDto, 
  ConvertRequestDto,
  FileDto 
} from '../dto/requests';
import {
  PufAnalysisResultDto,
  StableGenerationResultDto,
  KeyExtractionResultDto,
  ConversionResultDto,
  PufMetricDto,
  TotalMetricDto
} from '../dto/responses';
import {
  CommandExecutionResultDto,
  PufCommandOptionsDto
} from '../dto/pufMetrics';

export class JavaCliService {
  private readonly jarPath: string;

  constructor() {
    this.jarPath = this.getJarPath();
  }

  private getJarPath(): string {
    const isDev = !app.isPackaged;
    if (isDev) {
      return join(process.cwd(), '../dram-puf-cli/target/pufmetrics-1.0-SNAPSHOT.jar');
    }
    return join(process.resourcesPath, 'pufmetrics.jar');
  }

  async executeMetrics(request: MetricsRequestDto): Promise<PufAnalysisResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-metrics-'));
    const tempFiles: string[] = [];

    try {
      for (const file of request.files) {
        const tempFilePath = join(tempDir, file.name);
        await writeFile(tempFilePath, file.data);
        tempFiles.push(tempFilePath);
      }

      const args = ['metrics'];
      if (request.onlyTotal) args.push('--only-total');
      if (request.findComma) args.push('--find-comma');
      if (request.startIndicator) args.push('--start-indicator', request.startIndicator);
      if (request.initValue) args.push('--init-value', request.initValue);
      if (request.jobs) args.push('--jobs', request.jobs.toString());
      args.push(...tempFiles);

      const result = await this.executeCommand(args);
      return this.parseMetricsOutput(result.stdout, request.files.map(f => f.name), result.executionTime);
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async generateStable(request: StableRequestDto): Promise<StableGenerationResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-stable-'));
    const tempFiles: string[] = [];

    try {
      for (const file of request.files) {
        const tempFilePath = join(tempDir, file.name);
        await writeFile(tempFilePath, file.data);
        tempFiles.push(tempFilePath);
      }

      const outputFile = join(tempDir, 'stable.pos');
      const args = [
        'genstable',
        '--key-size', request.keyLength.toString(),
        '--out-file', outputFile
      ];
      
      if (request.findComma) args.push('--find-comma');
      args.push(...tempFiles);

      const result = await this.executeCommand(args);
      const positions = await this.readStablePositions(outputFile);
      
      return {
        outputFile: 'stable.pos',
        keyLength: request.keyLength,
        stableZeroes: Math.floor(positions.length / 2),
        stableOnes: Math.ceil(positions.length / 2),
        positions,
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async extractKey(request: ExtractRequestDto): Promise<KeyExtractionResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-extract-'));
    
    try {
      const binFilePath = join(tempDir, request.binFile.name);
      const stableFilePath = join(tempDir, request.stableFile.name);
      const outputFile = join(tempDir, 'extracted.key');

      await writeFile(binFilePath, request.binFile.data);
      await writeFile(stableFilePath, request.stableFile.data);

      const args = [
        'extract',
        binFilePath,
        stableFilePath,
        '--out-file', outputFile
      ];

      if (request.findComma) args.push('--find-comma');

      const result = await this.executeCommand(args);
      const extractedKey = await this.readExtractedKey(outputFile);

      return {
        outputFile: 'extracted.key',
        extractedKey,
        keyLength: extractedKey.length,
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir]);
    }
  }

  async convertBinary(request: ConvertRequestDto): Promise<ConversionResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-convert-'));
    const tempFiles: string[] = [];

    try {
      const args = ['binary', '--from', request.from];
      
      if (request.binWidth) args.push('--bin-width', request.binWidth.toString());
      if (request.line && request.input) {
        args.push('--line', request.input);
      } else if (request.files) {
        for (const file of request.files) {
          const tempFilePath = join(tempDir, file.name);
          await writeFile(tempFilePath, file.data);
          tempFiles.push(tempFilePath);
        }
        args.push(...tempFiles);
      }
      
      if (request.findComma) args.push('--find-comma');

      const result = await this.executeCommand(args);
      
      return {
        outputFiles: this.extractOutputFilenames(result.stdout),
        inputFormat: request.from,
        outputFormat: request.from === 'bin' ? 'txt' : 'bin',
        filesProcessed: request.files?.length || 1,
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  private async executeCommand(args: string[]): Promise<CommandExecutionResultDto> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const child = spawn('java', ['-jar', this.jarPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const executionTime = Date.now() - startTime;
        
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
          executionTime,
          command: `java -jar ${this.jarPath} ${args.join(' ')}`,
          tempFiles: []
        });
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute Java command: ${error.message}`));
      });
    });
  }

  private parseMetricsOutput(output: string, fileNames: string[], executionTime: number): PufAnalysisResultDto {
    const lines = output.split('\n');
    const individualMetrics: PufMetricDto[] = [];
    let totalMetric: TotalMetricDto | null = null;
    let currentMetric: Partial<PufMetricDto> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('Bits:')) {
        if (currentMetric) individualMetrics.push(currentMetric as PufMetricDto);
        currentMetric = { totalBits: parseInt(trimmed.split(':')[1].trim()) };
      } else if (trimmed.startsWith('Zeroes:') && currentMetric) {
        currentMetric.zeroes = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Ones (Hamming Weight):') && currentMetric) {
        currentMetric.ones = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Bitflips:') && currentMetric) {
        currentMetric.flips = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Frac Hamming Weight:') && currentMetric) {
        currentMetric.fractionalHW = parseFloat(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Bitflip percentage:') && currentMetric) {
        currentMetric.flipPercentage = parseFloat(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Shannon Entropy:') && currentMetric) {
        currentMetric.shannonEntropy = parseFloat(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Total bitflips:')) {
        totalMetric = {
          usedFiles: fileNames.length,
          totalBits: 0,
          flipsTotal: parseInt(trimmed.split(':')[1].trim()),
          flipsSame: 0,
          flips1Not2: 0,
          flips2Not1: 0,
          hammingDist: 0,
          jaccardIndex: 0,
          fracHammingDistance: 0
        };
      } else if (trimmed.startsWith('Same bitflips:') && totalMetric) {
        totalMetric.flipsSame = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Hamming distance:') && totalMetric) {
        totalMetric.hammingDist = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Frac Hamming distance:') && totalMetric) {
        totalMetric.fracHammingDistance = parseFloat(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('Jaccard index:') && totalMetric) {
        totalMetric.jaccardIndex = parseFloat(trimmed.split(':')[1].trim());
      }
    }

    if (currentMetric) individualMetrics.push(currentMetric as PufMetricDto);

    return {
      totalMetric: totalMetric!,
      individualMetrics,
      filesUsed: fileNames,
      executionTime
    };
  }

  private async readStablePositions(filePath: string): Promise<number[]> {
    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf-8');
      return content.split('\n').filter(line => line.trim()).map(line => parseInt(line.trim()));
    } catch {
      return [];
    }
  }

  private async readExtractedKey(filePath: string): Promise<string> {
    try {
      const { readFile } = await import('fs/promises');
      return await readFile(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  private extractOutputFilenames(output: string): string[] {
    const filenames: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('_conv.')) {
        const match = line.match(/(\w+_conv\.\w+)/);
        if (match) filenames.push(match[1]);
      }
    }
    
    return filenames;
  }

  private async cleanupTempFiles(paths: string[]): Promise<void> {
    const promises = paths.map(async (path) => {
      try {
        await unlink(path);
      } catch {
        try {
          const { rmdir } = await import('fs/promises');
          await rmdir(path, { recursive: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    });
    
    await Promise.all(promises);
  }
}