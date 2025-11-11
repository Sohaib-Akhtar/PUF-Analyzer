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
}

export interface AnalysisJobResultDto {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: PufAnalysisResultDto | StableGenerationResultDto | KeyExtractionResultDto | ConversionResultDto;
  error?: string;
  createdAt: string;
  completedAt?: string;
}