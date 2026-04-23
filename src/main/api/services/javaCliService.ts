import { spawn } from 'child_process';
import { writeFile, unlink, mkdtemp, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { app } from 'electron';
import { 
  MetricsRequestDto, 
  StableRequestDto, 
  ExtractRequestDto, 
  ConvertRequestDto,
  HexConvertRequestDto,
  ImageConvertRequestDto,
  AugmentRequestDto,
  CorruptRequestDto,
  FixLFRequestDto,
  NistAverageRequestDto,
  RandomDataRequestDto,
  RepeatedDataRequestDto,
  FileDto 
} from '../dto/requests';
import {
  PufAnalysisResultDto,
  StableGenerationResultDto,
  KeyExtractionResultDto,
  ConversionResultDto,
  HexConversionResultDto,
  ImageConversionResultDto,
  AugmentResultDto,
  CorruptResultDto,
  FixLFResultDto,
  NistAverageResultDto,
  NistTestResultDto,
  RandomDataResultDto,
  RepeatedDataResultDto,
  GeneratedFileDto,
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

  /**
   * Check if a Buffer contains text-encoded binary data (ASCII '0'/'1' with optional whitespace).
   * The Java CLI expects raw binary files where each byte = 8 data bits.
   * Text files store one bit per character ('0'=0x30, '1'=0x31), which the CLI misinterprets.
   */
  private isTextBinaryData(data: Buffer): boolean {
    if (data.length === 0) return false;
    let start = 0;
    // Skip UTF-8 BOM if present
    if (data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
      start = 3;
    }
    let hasBinaryDigits = false;
    for (let i = start; i < data.length; i++) {
      const byte = data[i];
      if (byte === 0x30 || byte === 0x31) {
        hasBinaryDigits = true;
      } else if (byte !== 0x0A && byte !== 0x0D && byte !== 0x20 && byte !== 0x09) {
        // Found a byte that's not '0', '1', or whitespace → not text binary
        return false;
      }
    }
    return hasBinaryDigits;
  }

  /**
   * Convert a text binary string (e.g. "01001101...") to actual binary bytes.
   * Groups every 8 binary digits into one byte. This is required because the
   * Java CLI metrics command reads files as raw bytes, processing each byte as 8 bits.
   */
  private textBinaryToBytes(textData: Buffer): Buffer {
    const text = textData.toString('utf-8');
    // Strip everything except '0' and '1'
    const binaryString = text.replace(/[^01]/g, '');
    if (binaryString.length === 0) return Buffer.alloc(0);

    // Pad to a multiple of 8 so the last byte is complete
    const paddedLength = Math.ceil(binaryString.length / 8) * 8;
    const padded = binaryString.padEnd(paddedLength, '0');

    const bytes = Buffer.alloc(padded.length / 8);
    for (let i = 0; i < padded.length; i += 8) {
      bytes[i / 8] = parseInt(padded.substring(i, i + 8), 2);
    }
    return bytes;
  }

  /**
   * Prepare a file for the Java CLI: if it is a text binary file, convert it
   * to actual binary bytes so the CLI processes the correct number of bits.
   * Returns { data, name } with potentially converted data and .bin extension.
   */
  private prepareFileForCli(file: { name: string; data: Buffer }): { name: string; data: Buffer } {
    if (this.isTextBinaryData(file.data)) {
      const convertedData = this.textBinaryToBytes(file.data);
      const convertedName = file.name.replace(/\.txt$/i, '.bin');
      return { name: convertedName, data: convertedData };
    }
    return { name: file.name, data: file.data };
  }

  async executeMetrics(request: MetricsRequestDto): Promise<PufAnalysisResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-metrics-'));
    const tempFiles: string[] = [];
    const originalNames: string[] = [];

    try {
      for (const file of request.files) {
        // Convert text binary files to actual binary bytes for the Java CLI
        const prepared = this.prepareFileForCli(file);
        const tempFilePath = join(tempDir, prepared.name);
        await writeFile(tempFilePath, prepared.data);
        tempFiles.push(tempFilePath);
        originalNames.push(file.name);
      }

      const args = ['metrics'];
      if (request.onlyTotal) args.push('--only-total');
      if (request.startIndicator) args.push('--start-indicator', request.startIndicator);
      if (request.initValue) args.push('--init-value', request.initValue);
      if (request.jobs) args.push('--jobs', request.jobs.toString());
      args.push(...tempFiles);

      const result = await this.executeCommand(args);
      return this.parseMetricsOutput(result.stdout, originalNames, result.executionTime);
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async generateStable(request: StableRequestDto): Promise<StableGenerationResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-stable-'));
    const tempFiles: string[] = [];

    try {
      for (const file of request.files) {
        const prepared = this.prepareFileForCli(file);
        const tempFilePath = join(tempDir, prepared.name);
        await writeFile(tempFilePath, prepared.data);
        tempFiles.push(tempFilePath);
      }

      const outputFile = join(tempDir, 'stable.pos');
      const args = [
        'genstable',
        '--key-size', request.keyLength.toString(),
        '--out-file', outputFile
      ];
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
      const preparedBin = this.prepareFileForCli(request.binFile);
      const binFilePath = join(tempDir, preparedBin.name);
      const stableFilePath = join(tempDir, request.stableFile.name);
      const outputFile = join(tempDir, 'extracted.key');

      await writeFile(binFilePath, preparedBin.data);
      await writeFile(stableFilePath, request.stableFile.data);

      const args = [
        'extract',
        binFilePath,
        stableFilePath,
        '--out-file', outputFile
      ];

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

      const result = await this.executeCommand(args);
      const generatedFiles = await this.collectOutputFiles(tempDir, tempFiles);
      
      return {
        outputFiles: generatedFiles.map(f => f.filename),
        inputFormat: request.from,
        outputFormat: request.from === 'bin' ? 'txt' : 'bin',
        filesProcessed: request.files?.length || 1,
        executionTime: result.executionTime,
        generatedFiles
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async convertHex(request: HexConvertRequestDto): Promise<HexConversionResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-hex-'));
    const tempFiles: string[] = [];

    try {
      const args = ['hex', '--from', request.from];

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

      const result = await this.executeCommand(args);
      const generatedFiles = await this.collectOutputFiles(tempDir, tempFiles);

      return {
        outputFiles: generatedFiles.map(f => f.filename),
        inputFormat: request.from,
        outputFormat: request.from === 'hex' ? 'txt' : 'hex',
        filesProcessed: request.files?.length || 1,
        executionTime: result.executionTime,
        generatedFiles
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async convertImage(request: ImageConvertRequestDto): Promise<ImageConversionResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-image-'));
    const tempFiles: string[] = [];

    try {
      for (const file of request.files) {
        const tempFilePath = join(tempDir, file.name);
        await writeFile(tempFilePath, file.data);
        tempFiles.push(tempFilePath);
      }

      const args = ['image', '--from', request.from];
      if (request.imageWidth) args.push('--image-width', request.imageWidth.toString());
      if (request.imageHeight) args.push('--image-height', request.imageHeight.toString());
      args.push(...tempFiles);

      const result = await this.executeCommand(args);
      const generatedFiles = await this.collectOutputFiles(tempDir, tempFiles);

      return {
        outputFiles: generatedFiles.map(f => f.filename),
        inputFormat: request.from,
        outputFormat: request.from === 'bin' ? 'png' : 'bin',
        filesProcessed: request.files.length,
        executionTime: result.executionTime,
        generatedFiles
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async augmentData(request: AugmentRequestDto): Promise<AugmentResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-augment-'));
    const tempFiles: string[] = [];

    try {
      for (const file of request.files) {
        const prepared = this.prepareFileForCli(file);
        const tempFilePath = join(tempDir, prepared.name);
        await writeFile(tempFilePath, prepared.data);
        tempFiles.push(tempFilePath);
      }

      const args = ['augment'];
      if (request.flipChance0) args.push('--flip-chance-0', request.flipChance0.toString());
      if (request.flipChance1) args.push('--flip-chance-1', request.flipChance1.toString());
      if (request.augmentFactor) args.push('--augment-factor', request.augmentFactor.toString());
      if (request.bits) args.push('--bits', request.bits.toString());
      if (request.regenOriginal) args.push('--regen-original');
      if (request.deleteOriginal) args.push('--delete-original');
      if (request.suffix) args.push('--suffix', request.suffix);
      args.push('--output-dir', tempDir);
      args.push(...tempFiles);

      const result = await this.executeCommand(args);
      const generatedFiles = await this.collectOutputFiles(tempDir, tempFiles);

      return {
        filesProcessed: request.files.length,
        augmentFactor: request.augmentFactor || 15,
        generatedFiles,
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async corruptData(request: CorruptRequestDto): Promise<CorruptResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-corrupt-'));
    const tempFiles: string[] = [];

    try {
      for (const file of request.files) {
        const prepared = this.prepareFileForCli(file);
        const tempFilePath = join(tempDir, prepared.name);
        await writeFile(tempFilePath, prepared.data);
        tempFiles.push(tempFilePath);
      }

      const args = ['corrupt'];
      if (request.corruptPercentage) args.push('--corrupt-percentage', request.corruptPercentage.toString());
      if (request.bits) args.push('--bits', request.bits.toString());
      if (request.regenOriginal) args.push('--regen-original');
      if (request.deleteOriginal) args.push('--delete-original');
      args.push(...tempFiles);

      const result = await this.executeCommand(args);
      const generatedFiles = await this.collectOutputFiles(tempDir, tempFiles);

      return {
        filesProcessed: request.files.length,
        corruptPercentage: request.corruptPercentage || 15,
        generatedFiles,
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async fixLineFeeds(request: FixLFRequestDto): Promise<FixLFResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-fixlf-'));
    const tempFiles: string[] = [];

    try {
      for (const file of request.files) {
        const tempFilePath = join(tempDir, file.name);
        await writeFile(tempFilePath, file.data);
        tempFiles.push(tempFilePath);
      }

      const args = ['fixlf'];
      if (request.outSuffix) args.push('--out-suffix', request.outSuffix);
      args.push(...tempFiles);

      const result = await this.executeCommand(args);
      const generatedFiles = await this.collectOutputFiles(tempDir, tempFiles);

      return {
        filesProcessed: request.files.length,
        generatedFiles,
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async nistAverage(request: NistAverageRequestDto): Promise<NistAverageResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-nist-'));
    const tempFiles: string[] = [];

    try {
      for (const file of request.files) {
        const tempFilePath = join(tempDir, file.name);
        await writeFile(tempFilePath, file.data);
        tempFiles.push(tempFilePath);
      }

      const outputFile = join(tempDir, request.outFile || 'nist-avg.txt');
      const args = ['nistavg', '--out-file', outputFile, ...tempFiles];

      const result = await this.executeCommand(args);
      const tests = await this.parseNistOutput(outputFile);

      return {
        tests,
        outputFile: request.outFile || 'nist-avg.txt',
        filesProcessed: request.files.length,
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir, ...tempFiles]);
    }
  }

  async generateRandom(request: RandomDataRequestDto): Promise<RandomDataResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-random-'));

    try {
      const filenames = request.filenames || ['rnd.bin'];
      const tempFiles = filenames.map(f => join(tempDir, f));
      
      const args = ['random'];
      if (request.hammingWeightMultiplier) args.push('--hamming-weight-multiplier', request.hammingWeightMultiplier.toString());
      if (request.hammingWeight) args.push('--hamming-weight', request.hammingWeight.toString());
      if (request.bits) args.push('--bits', request.bits.toString());
      args.push(...tempFiles);

      const result = await this.executeCommand(args);
      const generatedFiles = await this.collectAllFiles(tempDir);

      return {
        generatedFiles,
        bits: request.bits || 262144,
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir]);
    }
  }

  async generateRepeated(request: RepeatedDataRequestDto): Promise<RepeatedDataResultDto> {
    const tempDir = await mkdtemp(join(tmpdir(), 'puf-repeated-'));

    try {
      const filename = request.filename || `${request.data || '00000000'}.bin`;
      const outputPath = join(tempDir, filename);

      const args = ['repeated'];
      if (request.bits) args.push('--bits', request.bits.toString());
      if (request.data) args.push('--data', request.data);
      args.push(outputPath);

      const result = await this.executeCommand(args);

      let generatedFile: GeneratedFileDto;
      try {
        const content = await readFile(outputPath);
        generatedFile = {
          filename,
          content: content.toString('base64'),
          size: content.length
        };
      } catch {
        generatedFile = { filename, content: '', size: 0 };
      }

      return {
        generatedFile,
        bits: request.bits || 262144,
        pattern: request.data || '00000000',
        executionTime: result.executionTime
      };
    } finally {
      await this.cleanupTempFiles([tempDir]);
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
          // Only treat as failure if exit code is non-zero.
        // Java may write warnings to stderr even on success.
        if (code !== 0) {
          const stderrLines = stderr.trim().split('\n');
          const errorLine = stderrLines.find(l =>
            l.includes('Exception') || l.includes('Error')
          ) || stderrLines[0] || `Process exited with code ${code}`;
          reject(new Error(`CLI command failed (exit code ${code}): ${errorLine}`));
          return;
        }

        const success = true;

        resolve({
          success,
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
    let inTotalSection = false;
    const warningMessages: string[] = [];

    // Safe value extraction after the first colon
    const parseIntAfterColon = (s: string): number => parseInt(s.split(':').slice(1).join(':').trim()) || 0;
    const parseFloatAfterColon = (s: string): number => parseFloat(s.split(':').slice(1).join(':').trim()) || 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect the double separator that marks the start of the total metrics section
      // The Java output has two "=====...=====" lines before the total metrics
      if (trimmed.match(/^={10,}$/) && !inTotalSection) {
        // Finalize any in-progress individual metric before entering total section
        if (currentMetric && Object.keys(currentMetric).length > 1) {
          individualMetrics.push(currentMetric as PufMetricDto);
          currentMetric = null;
        }
      }

      // ── Individual metric fields ──
      if (!inTotalSection && trimmed.startsWith('Bits:')) {
        if (currentMetric && Object.keys(currentMetric).length > 1) {
          individualMetrics.push(currentMetric as PufMetricDto);
        }
        currentMetric = { totalBits: parseIntAfterColon(trimmed) };
      } else if (!inTotalSection && trimmed.startsWith('Zeroes:') && currentMetric) {
        currentMetric.zeroes = parseIntAfterColon(trimmed);
      } else if (!inTotalSection && trimmed.startsWith('Ones (Hamming Weight):') && currentMetric) {
        currentMetric.ones = parseIntAfterColon(trimmed);
      } else if (!inTotalSection && trimmed.startsWith('Bitflips:') && currentMetric) {
        currentMetric.flips = parseIntAfterColon(trimmed);
      } else if (!inTotalSection && trimmed.startsWith('Frac Hamming Weight:') && currentMetric) {
        currentMetric.fractionalHW = parseFloatAfterColon(trimmed);
      } else if (!inTotalSection && trimmed.startsWith('Bitflip percentage:') && currentMetric) {
        currentMetric.flipPercentage = parseFloatAfterColon(trimmed);
      } else if (!inTotalSection && trimmed.startsWith('Shannon Entropy:') && currentMetric) {
        currentMetric.shannonEntropy = parseFloatAfterColon(trimmed);
      }

      // ── Total metrics section ──
      else if (trimmed.startsWith('Total bitflips:')) {
        inTotalSection = true;
        // Push any remaining individual metric
        if (currentMetric && Object.keys(currentMetric).length > 1) {
          individualMetrics.push(currentMetric as PufMetricDto);
          currentMetric = null;
        }
        totalMetric = {
          usedFiles: fileNames.length,
          totalBits: 0,
          flipsTotal: parseIntAfterColon(trimmed),
          flipsSame: 0,
          flips1Not2: 0,
          flips2Not1: 0,
          hammingDist: 0,
          jaccardIndex: 0,
          fracHammingDistance: 0
        };
      } else if (trimmed.startsWith('Same bitflips:') && totalMetric) {
        totalMetric.flipsSame = parseIntAfterColon(trimmed);
      } else if (trimmed.startsWith('Hamming distance:') && totalMetric) {
        totalMetric.hammingDist = parseIntAfterColon(trimmed);
      } else if (trimmed.startsWith('Frac Hamming distance:') && totalMetric) {
        totalMetric.fracHammingDistance = parseFloatAfterColon(trimmed);
      } else if (trimmed.startsWith('Jaccard index:') && totalMetric) {
        totalMetric.jaccardIndex = parseFloatAfterColon(trimmed);
      } else if (trimmed.startsWith('Bitflips in 1 not in 2:') && totalMetric) {
        totalMetric.flips1Not2 = parseIntAfterColon(trimmed);
      } else if (trimmed.startsWith('Bitflips in 2 not in 1:') && totalMetric) {
        totalMetric.flips2Not1 = parseIntAfterColon(trimmed);
      }

      // Capture size warnings from Java CLI
      if (trimmed.includes('different lengths')) {
        warningMessages.push(trimmed);
      }
    }

    // Finalize last individual metric if still pending
    if (currentMetric && Object.keys(currentMetric).length > 1) {
      individualMetrics.push(currentMetric as PufMetricDto);
    }

    // Derive totalBits for the total metric from individual metrics
    // The Java CLI's TotalMetric.totalBits = sum of per-thread localPufMetrics[0].totalBits
    // which equals any single individual metric's totalBits (all files share the same bit count)
    if (totalMetric) {
      if (individualMetrics.length > 0 && individualMetrics[0]) {
        totalMetric.totalBits = individualMetrics[0].totalBits;
      } else if (totalMetric.hammingDist > 0 && totalMetric.fracHammingDistance > 0) {
        // Back-calculate from fracHammingDistance = hammingDist / totalBits
        totalMetric.totalBits = Math.round(totalMetric.hammingDist / totalMetric.fracHammingDistance);
      }
    }

    const result: PufAnalysisResultDto = {
      totalMetric: totalMetric!,
      individualMetrics,
      filesUsed: fileNames,
      executionTime
    };

    if (warningMessages.length > 0) {
      result.warningMessages = warningMessages;
    }

    return result;
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

  private async collectOutputFiles(tempDir: string, inputFiles: string[]): Promise<GeneratedFileDto[]> {
    const inputBasenames = new Set(inputFiles.map(f => f.split(/[\\/]/).pop()!));
    const generated: GeneratedFileDto[] = [];

    try {
      const allFiles = await readdir(tempDir);
      for (const filename of allFiles) {
        if (!inputBasenames.has(filename)) {
          const filePath = join(tempDir, filename);
          try {
            const content = await readFile(filePath);
            generated.push({
              filename,
              content: content.toString('base64'),
              size: content.length
            });
          } catch {
            // skip unreadable files
          }
        }
      }
    } catch {
      // directory read failed
    }

    return generated;
  }

  private async collectAllFiles(dir: string): Promise<GeneratedFileDto[]> {
    const generated: GeneratedFileDto[] = [];

    try {
      const allFiles = await readdir(dir);
      for (const filename of allFiles) {
        const filePath = join(dir, filename);
        try {
          const content = await readFile(filePath);
          generated.push({
            filename,
            content: content.toString('base64'),
            size: content.length
          });
        } catch {
          // skip unreadable files
        }
      }
    } catch {
      // directory read failed
    }

    return generated;
  }

  private async parseNistOutput(filePath: string): Promise<NistTestResultDto[]> {
    const tests: NistTestResultDto[] = [];
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const parts = line.split(';');
        if (parts.length >= 3) {
          const testName = parts[0].trim();
          const pValue = parseFloat(parts[1].trim());
          const passed = parts[2].trim().toLowerCase() === 'pass';
          if (testName && !isNaN(pValue)) {
            tests.push({ testName, pValue, passed });
          }
        }
      }
    } catch {
      // file read failed
    }
    return tests;
  }

  private async cleanupTempFiles(paths: string[]): Promise<void> {
    const promises = paths.map(async (path) => {
      try {
        await unlink(path);
      } catch {
        try {
          const { rm } = await import('fs/promises');
          await rm(path, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    });
    
    await Promise.all(promises);
  }
}