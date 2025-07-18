export interface Device {
  id: number;
  name: string;
  description?: string;
  device_type?: string;
  status: string;
  created_at: string;
}

export interface FileRecord {
  id: number;
  filename: string;
  device_id: number;
  file_path: string;
  created_at: string;
}

export interface CreateDeviceDto {
  name: string;
  description?: string;
  device_type?: string;
  status?: string;
}

export interface CreateFileDto {
  filename: string;
  device_id: number;
  file_path: string;
}