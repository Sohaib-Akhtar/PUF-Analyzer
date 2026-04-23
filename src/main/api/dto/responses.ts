export interface ApiResponseDto<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PufMetricDto {
  zeroes: number;
  ones: number;
  flips: number;
  totalBits: number;
  flipPercentage: number;
  fractionalHW: number;
  shannonEntropy: number;
}

export interface TotalMetricDto {
  usedFiles: number;
  totalBits: number;
  flipsTotal: number;
  flipsSame: number;
  flips1Not2: number;
  flips2Not1: number;
  hammingDist: number;
  jaccardIndex: number;
  fracHammingDistance: number;
}

export interface PufAnalysisResultDto {
  totalMetric: TotalMetricDto;
  individualMetrics: PufMetricDto[];
  filesUsed: string[];
  executionTime: number;
  warningMessages?: string[];
}

export interface StableGenerationResultDto {
  outputFile: string;
  keyLength: number;
  stableZeroes: number;
  stableOnes: number;
  positions: number[];
  executionTime: number;
}

export interface KeyExtractionResultDto {
  outputFile: string;
  extractedKey: string;
  keyLength: number;
  executionTime: number;
}

export interface ConversionResultDto {
  outputFiles: string[];
  inputFormat: string;
  outputFormat: string;
  filesProcessed: number;
  executionTime: number;
  generatedFiles?: GeneratedFileDto[];
}

export interface GeneratedFileDto {
  filename: string;
  content: string; // base64 encoded
  size: number;
}

export interface HexConversionResultDto {
  outputFiles: string[];
  inputFormat: string;
  outputFormat: string;
  filesProcessed: number;
  executionTime: number;
  generatedFiles?: GeneratedFileDto[];
}

export interface ImageConversionResultDto {
  outputFiles: string[];
  inputFormat: string;
  outputFormat: string;
  filesProcessed: number;
  executionTime: number;
  generatedFiles?: GeneratedFileDto[];
}

export interface AugmentResultDto {
  filesProcessed: number;
  augmentFactor: number;
  generatedFiles: GeneratedFileDto[];
  executionTime: number;
}

export interface CorruptResultDto {
  filesProcessed: number;
  corruptPercentage: number;
  generatedFiles: GeneratedFileDto[];
  executionTime: number;
}

export interface FixLFResultDto {
  filesProcessed: number;
  generatedFiles: GeneratedFileDto[];
  executionTime: number;
}

export interface NistTestResultDto {
  testName: string;
  pValue: number;
  passed: boolean;
}

export interface NistAverageResultDto {
  tests: NistTestResultDto[];
  outputFile: string;
  filesProcessed: number;
  executionTime: number;
}

export interface RandomDataResultDto {
  generatedFiles: GeneratedFileDto[];
  bits: number;
  executionTime: number;
}

export interface RepeatedDataResultDto {
  generatedFile: GeneratedFileDto;
  bits: number;
  pattern: string;
  executionTime: number;
}

export interface AnalysisJobResultDto {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: PufAnalysisResultDto | StableGenerationResultDto | KeyExtractionResultDto | ConversionResultDto;
  error?: string;
  createdAt: string;
  completedAt?: string;
}