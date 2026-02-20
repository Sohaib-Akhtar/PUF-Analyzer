export interface ValidationErrorDto {
  field: string;
  message: string;
  code: string;
}

export interface FileValidationResultDto {
  isValid: boolean;
  fileName: string;
  fileSize: number;
  errors: ValidationErrorDto[];
  lineCount?: number;
  binaryStringFormat?: boolean;
}

export interface BatchValidationResultDto {
  allValid: boolean;
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  results: FileValidationResultDto[];
  globalErrors: string[];
}

export interface PufCommandOptionsDto {
  command: 'metrics' | 'genstable' | 'extract' | 'binary' | 'hex' | 'image' | 'augment' | 'corrupt' | 'fixlf' | 'nistavg' | 'random' | 'repeated';
  findComma: boolean;
  startIndicator: string;
  initValue: string;
  jobs: number;
  keyLength?: number;
  binWidth?: number;
  outputFile?: string;
}

export interface CommandExecutionResultDto {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  command: string;
  tempFiles: string[];
}

export interface DeviceAnalysisHistoryDto {
  id: number;
  deviceId: number;
  analysisType: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
  executionTime: number;
  createdAt: string;
}