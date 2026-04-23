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

  static extractDeviceNameFromFilename(filename: string): string {
    const baseName = basename(filename, extname(filename));
    
    // Device name = everything before the first underscore (case-insensitive, lowercased)
    // e.g. "stellaris1_26183504_conv" -> "stellaris1"
    //      "tiva_new1_26181658"       -> "tiva"
    //      "mydevice"                 -> "mydevice"
    const underscoreIndex = baseName.indexOf('_');
    const deviceName = underscoreIndex !== -1
      ? baseName.substring(0, underscoreIndex)
      : baseName;

    return deviceName.toLowerCase() || baseName.toLowerCase();
  }

  static validateFileExtension(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return this.ALLOWED_EXTENSIONS.includes(ext);
  }

  /**
   * Check if content is text-encoded binary data (only 0s, 1s, and whitespace).
   */
  private static isTextBinaryContent(content: string): boolean {
    // Must contain at least some 0/1 characters and only consist of 0, 1, whitespace
    const stripped = content.replace(/\s/g, '');
    return stripped.length > 0 && /^[01]+$/.test(stripped);
  }

  /**
   * Check if a raw byte buffer looks like text binary data (ASCII 0x30/0x31 + whitespace).
   * Returns false for actual binary files that contain byte values outside the text range.
   */
  private static isTextBinaryBuffer(data: Buffer): boolean {
    if (data.length === 0) return false;
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      // Only allow ASCII '0' (0x30), '1' (0x31), LF (0x0A), CR (0x0D), space (0x20), tab (0x09)
      if (byte !== 0x30 && byte !== 0x31 && byte !== 0x0A && byte !== 0x0D && byte !== 0x20 && byte !== 0x09) {
        return false;
      }
    }
    return true;
  }

  /**
   * Strip everything except '0' and '1' from text content.
   * Handles newlines, spaces, tabs, carriage returns, and any other non-binary characters.
   */
  static cleanBinaryData(content: string): string {
    return content.replace(/[^01]/g, '');
  }

  /**
   * Convert raw binary bytes to a binary string representation.
   * Each byte becomes 8 characters of '0'/'1'.
   */
  private static rawBytesToBinaryString(data: Buffer): string {
    const parts: string[] = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
      parts[i] = (data[i] ?? 0).toString(2).padStart(8, '0');
    }
    return parts.join('');
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

      const rawBytes = readFileSync(filePath);
      const fileExtension = extname(filename).toLowerCase();
      
      let binaryData: string;

      if (rawBytes.length === 0) {
        return {
          success: false,
          error: `File "${filename}" is empty.`
        };
      }

      if (fileExtension === '.txt') {
        // Text files should contain binary strings: lines of '0' and '1' characters
        const textContent = rawBytes.toString('utf8');
        binaryData = this.cleanBinaryData(textContent);
        
        if (binaryData.length === 0) {
          return {
            success: false,
            error: `Text file "${filename}" contains no valid binary data (only 0s and 1s expected).`
          };
        }
      } else if (fileExtension === '.bin') {
        // Binary files can be either:
        // 1. Text-encoded binary (contains only ASCII 0/1 + whitespace) — treat like .txt
        // 2. Actual raw binary data — convert each byte to 8-bit representation
        if (this.isTextBinaryBuffer(rawBytes)) {
          const textContent = rawBytes.toString('utf8');
          binaryData = this.cleanBinaryData(textContent);
        } else {
          binaryData = this.rawBytesToBinaryString(rawBytes);
        }

        if (binaryData.length === 0) {
          return {
            success: false,
            error: `Binary file "${filename}" contains no valid data after processing.`
          };
        }
      } else {
        return {
          success: false,
          error: `Unsupported file extension: ${fileExtension}`
        };
      }

      const deviceName = this.extractDeviceNameFromFilename(filename);
      // fileSize = number of bits (length of the binary string)
      const fileSize = binaryData.length;

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