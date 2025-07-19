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