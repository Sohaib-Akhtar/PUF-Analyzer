import { readFileSync } from 'fs';
import { basename, extname } from 'path';

export interface ProcessedFile {
  deviceName: string;
  filename: string;
  originalFilename: string;
  binaryData: string;
  fileSize: number;
  fileExtension: string;
}

export interface ProcessingResult {
  success: boolean;
  data?: ProcessedFile;
  error?: string;
}

export class FileProcessingService {
  private static readonly ALLOWED_EXTENSIONS = ['.bin', '.txt'];
  private static readonly BINARY_PATTERN = /^[01\s\r\n\t]+$/;

  static extractDeviceNameFromFilename(filename: string): string {
    const baseName = basename(filename, extname(filename));
    
    let deviceName = baseName
      .replace(/([_-]\d+)+$/, '')
      .replace(/[_-]reading\d*$/i, '')
      .replace(/[_-](run|test|sample)\d*$/i, '')
      .replace(/[_-]\d+$/, '');
    
    if (!deviceName || deviceName.length === 0) {
      const match = baseName.match(/^([a-zA-Z_-]+)/);
      deviceName = match ? match[1] : baseName;
    }
    
    return deviceName.toLowerCase().replace(/[_-]+$/, '');
  }

  static validateFileExtension(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return this.ALLOWED_EXTENSIONS.includes(ext);
  }

  static validateBinaryContent(content: string): boolean {
    const cleanContent = content.replace(/\s/g, '');
    return this.BINARY_PATTERN.test(content) && cleanContent.length > 0;
  }

  static cleanBinaryData(content: string): string {
    return content
      .replace(/\r\n/g, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\t/g, '')
      .replace(/\s/g, '')
      .replace(/[^01]/g, '');
  }

  static processFile(filePath: string): ProcessingResult {
    try {
      const filename = basename(filePath);
      
      if (!this.validateFileExtension(filename)) {
        return {
          success: false,
          error: `Invalid file extension. Only .bin and .txt files are allowed.`
        };
      }

      const fileContent = readFileSync(filePath, 'utf8');
      const fileExtension = extname(filename).toLowerCase();
      
      let binaryData: string;

      if (fileExtension === '.bin') {
        if (!this.validateBinaryContent(fileContent)) {
          return {
            success: false,
            error: `Binary file "${filename}" contains invalid characters. Only 0s and 1s are allowed.`
          };
        }
        binaryData = this.cleanBinaryData(fileContent);
      } else if (fileExtension === '.txt') {
        if (!this.validateBinaryContent(fileContent)) {
          return {
            success: false,
            error: `Text file "${filename}" does not contain valid binary data. Only 0s and 1s are allowed.`
          };
        }
        binaryData = this.cleanBinaryData(fileContent);
      } else {
        return {
          success: false,
          error: `Unsupported file extension: ${fileExtension}`
        };
      }

      if (binaryData.length === 0) {
        return {
          success: false,
          error: `File "${filename}" contains no valid binary data after processing.`
        };
      }

      const deviceName = this.extractDeviceNameFromFilename(filename);
      const fileSize = Buffer.byteLength(binaryData, 'utf8');

      return {
        success: true,
        data: {
          deviceName,
          filename: basename(filename),
          originalFilename: filename,
          binaryData,
          fileSize,
          fileExtension
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static processMultipleFiles(filePaths: string[]): {
    results: ProcessingResult[];
    deviceGroups: Map<string, ProcessedFile[]>;
  } {
    const results: ProcessingResult[] = [];
    const deviceGroups = new Map<string, ProcessedFile[]>();

    for (const filePath of filePaths) {
      const result = this.processFile(filePath);
      results.push(result);

      if (result.success && result.data) {
        const { deviceName } = result.data;
        if (!deviceGroups.has(deviceName)) {
          deviceGroups.set(deviceName, []);
        }
        deviceGroups.get(deviceName)!.push(result.data);
      }
    }

    return { results, deviceGroups };
  }

  static generateDownloadableContent(binaryData: string, format: 'bin' | 'txt' = 'bin'): string {
    return binaryData;
  }
}