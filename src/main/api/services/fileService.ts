import { FileDto } from '../dto/requests';
import {
  FileValidationResultDto,
  BatchValidationResultDto,
  ValidationErrorDto
} from '../dto/pufMetrics';

export class FileService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly VALID_EXTENSIONS = ['.txt', '.bin', '.pos'];
  private static readonly BINARY_LINE_LENGTH = 32;
  private static readonly BINARY_PATTERN = /^[01]+$/;
  private static readonly DEVICE_PATTERN = /^(tiva|stellaris|dram).*_\d+\.txt$/;

  validateFile(file: FileDto): FileValidationResultDto {
    const errors: ValidationErrorDto[] = [];
    let lineCount = 0;
    let binaryStringFormat = false;

    if (file.size === 0) {
      errors.push({
        field: 'size',
        message: 'File is empty',
        code: 'EMPTY_FILE'
      });
    }

    if (file.size > FileService.MAX_FILE_SIZE) {
      errors.push({
        field: 'size',
        message: `File size exceeds maximum allowed size of ${FileService.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }

    const extension = this.getFileExtension(file.name);
    if (!FileService.VALID_EXTENSIONS.includes(extension)) {
      errors.push({
        field: 'extension',
        message: `Invalid file extension. Allowed extensions: ${FileService.VALID_EXTENSIONS.join(', ')}`,
        code: 'INVALID_EXTENSION'
      });
    }

    if (extension === '.txt') {
      const contentValidation = this.validateBinaryContent(file.data);
      errors.push(...contentValidation.errors);
      lineCount = contentValidation.lineCount;
      binaryStringFormat = contentValidation.isBinaryFormat;

      if (!FileService.DEVICE_PATTERN.test(file.name)) {
        errors.push({
          field: 'name',
          message: 'Filename should follow pattern: devicetype_variant_timestamp.txt (e.g., tiva_original_26181245.txt)',
          code: 'INVALID_NAMING'
        });
      }
    }

    if (extension === '.bin') {
      const binaryValidation = this.validateBinaryFile(file.data);
      errors.push(...binaryValidation.errors);
    }

    if (extension === '.pos') {
      const posValidation = this.validatePositionFile(file.data);
      errors.push(...posValidation.errors);
      lineCount = posValidation.lineCount;
    }

    return {
      isValid: errors.length === 0,
      fileName: file.name,
      fileSize: file.size,
      errors,
      lineCount,
      binaryStringFormat
    };
  }

  validateBatch(files: FileDto[]): BatchValidationResultDto {
    if (files.length === 0) {
      return {
        allValid: false,
        totalFiles: 0,
        validFiles: 0,
        invalidFiles: 0,
        results: [],
        globalErrors: ['No files provided for validation']
      };
    }

    const results = files.map(file => this.validateFile(file));
    const validFiles = results.filter(r => r.isValid).length;
    const globalErrors: string[] = [];

    const textFiles = results.filter(r => r.fileName.endsWith('.txt'));
    if (textFiles.length > 1) {
      const lineCounts = textFiles.map(r => r.lineCount).filter(lc => lc > 0);
      const uniqueLineCounts = new Set(lineCounts);
      
      if (uniqueLineCounts.size > 1) {
        globalErrors.push(
          `Inconsistent file lengths detected. All files should have the same number of data lines. Found: ${Array.from(uniqueLineCounts).join(', ')}`
        );
      }
    }

    const fileSizes = results.map(r => r.fileSize);
    const avgSize = fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length;
    const outliers = fileSizes.filter(size => Math.abs(size - avgSize) > avgSize * 0.5);
    
    if (outliers.length > 0) {
      globalErrors.push(
        'File sizes vary significantly. This may indicate corrupt or incomplete files.'
      );
    }

    return {
      allValid: validFiles === files.length && globalErrors.length === 0,
      totalFiles: files.length,
      validFiles,
      invalidFiles: files.length - validFiles,
      results,
      globalErrors
    };
  }

  private validateBinaryContent(data: Buffer): { errors: ValidationErrorDto[], lineCount: number, isBinaryFormat: boolean } {
    const errors: ValidationErrorDto[] = [];
    const content = data.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      errors.push({
        field: 'content',
        message: 'File contains no valid data lines',
        code: 'NO_DATA_LINES'
      });
      return { errors, lineCount: 0, isBinaryFormat: false };
    }

    let isBinaryFormat = true;
    const expectedLength = FileService.BINARY_LINE_LENGTH;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!FileService.BINARY_PATTERN.test(line)) {
        isBinaryFormat = false;
        errors.push({
          field: 'content',
          message: `Line ${i + 1} contains invalid characters. Only 0 and 1 are allowed in binary format.`,
          code: 'INVALID_BINARY_CHARS'
        });
      }

      if (line.length !== expectedLength) {
        errors.push({
          field: 'content',
          message: `Line ${i + 1} has ${line.length} characters, expected ${expectedLength}`,
          code: 'INVALID_LINE_LENGTH'
        });
      }
    }

    if (lines.length < 10) {
      errors.push({
        field: 'content',
        message: 'File contains too few data lines. Minimum 10 lines required for meaningful analysis.',
        code: 'INSUFFICIENT_DATA'
      });
    }

    return { errors, lineCount: lines.length, isBinaryFormat };
  }

  private validateBinaryFile(data: Buffer): { errors: ValidationErrorDto[] } {
    const errors: ValidationErrorDto[] = [];

    if (data.length === 0) {
      errors.push({
        field: 'content',
        message: 'Binary file is empty',
        code: 'EMPTY_BINARY_FILE'
      });
    }

    if (data.length % 8 !== 0) {
      errors.push({
        field: 'content',
        message: 'Binary file length should be divisible by 8 for proper byte alignment',
        code: 'MISALIGNED_BINARY'
      });
    }

    return { errors };
  }

  private validatePositionFile(data: Buffer): { errors: ValidationErrorDto[], lineCount: number } {
    const errors: ValidationErrorDto[] = [];
    const content = data.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      errors.push({
        field: 'content',
        message: 'Position file contains no data',
        code: 'EMPTY_POSITION_FILE'
      });
      return { errors, lineCount: 0 };
    }

    const positions: number[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const position = parseInt(line, 10);
      
      if (isNaN(position) || position < 0) {
        errors.push({
          field: 'content',
          message: `Line ${i + 1}: "${line}" is not a valid position number`,
          code: 'INVALID_POSITION'
        });
      } else {
        positions.push(position);
      }
    }

    if (positions.length > 0) {
      const sortedPositions = [...positions].sort((a, b) => a - b);
      if (JSON.stringify(positions) !== JSON.stringify(sortedPositions)) {
        errors.push({
          field: 'content',
          message: 'Positions should be in ascending order',
          code: 'UNSORTED_POSITIONS'
        });
      }

      const duplicates = positions.filter((pos, idx) => positions.indexOf(pos) !== idx);
      if (duplicates.length > 0) {
        errors.push({
          field: 'content',
          message: `Duplicate positions found: ${duplicates.join(', ')}`,
          code: 'DUPLICATE_POSITIONS'
        });
      }
    }

    return { errors, lineCount: lines.length };
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot).toLowerCase();
  }

  sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  generateTimestamp(): string {
    return Date.now().toString();
  }

  createTempFilename(originalName: string, operation: string): string {
    const extension = this.getFileExtension(originalName);
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    const timestamp = this.generateTimestamp();
    return `${this.sanitizeFilename(baseName)}_${operation}_${timestamp}${extension}`;
  }
}