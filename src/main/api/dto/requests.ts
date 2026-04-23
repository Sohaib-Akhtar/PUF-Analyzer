export interface FileDto {
  name: string;
  data: Buffer;
  size: number;
  extension?: string;
}

export interface MetricsRequestDto {
  files: FileDto[];
  onlyTotal?: boolean;
  startIndicator?: string;
  initValue?: string;
  jobs?: number;
}

export interface StableRequestDto {
  files: FileDto[];
  keyLength: number;
}

export interface ExtractRequestDto {
  binFile: FileDto;
  stableFile: FileDto;
}

export interface ConvertRequestDto {
  files?: FileDto[];
  input?: string;
  from: 'bin' | 'txt';
  line?: boolean;
}

export interface HexConvertRequestDto {
  files?: FileDto[];
  input?: string;
  from: 'hex' | 'txt';
  line?: boolean;
}

export interface ImageConvertRequestDto {
  files: FileDto[];
  from: 'bin' | 'img';
  imageWidth?: number;
  imageHeight?: number;
}

export interface AugmentRequestDto {
  files: FileDto[];
  flipChance0?: number;
  flipChance1?: number;
  augmentFactor?: number;
  bits?: number;
  regenOriginal?: boolean;
  deleteOriginal?: boolean;
  suffix?: string;
}

export interface CorruptRequestDto {
  files: FileDto[];
  corruptPercentage?: number;
  bits?: number;
  regenOriginal?: boolean;
  deleteOriginal?: boolean;
}

export interface FixLFRequestDto {
  files: FileDto[];
  outSuffix?: string;
}

export interface NistAverageRequestDto {
  files: FileDto[];
  outFile?: string;
}

export interface RandomDataRequestDto {
  filenames?: string[];
  hammingWeightMultiplier?: number;
  hammingWeight?: number;
  bits?: number;
}

export interface RepeatedDataRequestDto {
  filename?: string;
  bits?: number;
  data?: string;
}

export interface AnalysisJobRequestDto {
  deviceId: number;
  operation: 'metrics' | 'stable' | 'extract' | 'convert' | 'hex' | 'image' | 'augment' | 'corrupt' | 'fixlf' | 'nist' | 'random' | 'repeated';
  parameters: Record<string, unknown>;
  files: FileDto[];
}