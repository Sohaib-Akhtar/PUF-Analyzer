export interface FileDto {
  name: string;
  data: Buffer;
  size: number;
  extension?: string;
}

export interface MetricsRequestDto {
  files: FileDto[];
  onlyTotal?: boolean;
  findComma?: boolean;
  startIndicator?: string;
  initValue?: string;
  jobs?: number;
}

export interface StableRequestDto {
  files: FileDto[];
  keyLength: number;
  findComma?: boolean;
}

export interface ExtractRequestDto {
  binFile: FileDto;
  stableFile: FileDto;
  findComma?: boolean;
}

export interface ConvertRequestDto {
  files?: FileDto[];
  input?: string;
  from: 'bin' | 'txt';
  binWidth?: number;
  line?: boolean;
  findComma?: boolean;
}

export interface AnalysisJobRequestDto {
  deviceId: number;
  operation: 'metrics' | 'stable' | 'extract' | 'convert';
  parameters: Record<string, unknown>;
  files: FileDto[];
}