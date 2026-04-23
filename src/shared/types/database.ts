export interface Device {
  id: number;
  name: string;
  description?: string;
  device_type?: string;
  status: string;
  readings_count: number;
  created_at: string;
}

export interface PufReading {
  id: number;
  device_id: number;
  filename: string;
  original_filename: string;
  binary_data: string;
  file_size: number;
  file_extension: string;
  upload_date: string;
}

export interface CreateDeviceDto {
  name: string;
  description?: string;
  device_type?: string;
  status?: string;
}

export interface CreatePufReadingDto {
  device_id: number;
  filename: string;
  original_filename: string;
  binary_data: string;
  file_size: number;
  file_extension: string;
}

export interface DeviceWithReadings extends Device {
  readings: PufReading[];
}

export interface FileUploadResult {
  success: boolean;
  deviceName: string;
  readingsAdded: number;
  errors?: string[];
}

export interface PufAnalysisResult {
  id: number;
  device_id: number | null;
  analysis_type: string;
  parameters: string;
  result_data: string;
  execution_time: number;
  files_used: string;
  status: string;
  created_at: string;
}

export interface PufAnalysisFile {
  id: number;
  analysis_id: number;
  filename: string;
  file_size: number;
  file_hash: string;
  created_at: string;
}

export interface CreatePufAnalysisDto {
  device_id: number | null;
  analysis_type: 'metrics' | 'stable' | 'extract' | 'convert' | 'hex' | 'image' | 'augment' | 'corrupt' | 'fixlf' | 'nist' | 'random' | 'repeated';
  parameters: Record<string, unknown>;
  result_data: Record<string, unknown>;
  execution_time: number;
  files_used: string[];
}

export interface CreatePufAnalysisFileDto {
  analysis_id: number;
  filename: string;
  file_size: number;
  file_hash: string;
}

export interface AnalysisWithFiles extends PufAnalysisResult {
  files: PufAnalysisFile[];
}