import { Database } from 'better-sqlite3';
import { basename, extname } from 'path';
import { DeviceService } from './deviceService';
import { PufReadingService } from './pufReadingService';
import { FileProcessingService, ProcessedFile } from './fileProcessingService';
import { FileUploadResult } from '../../shared/types/database';

export class FileUploadService {
  private deviceService: DeviceService;
  private pufReadingService: PufReadingService;

  constructor(private db: Database) {
    this.deviceService = new DeviceService(db);
    this.pufReadingService = new PufReadingService(db);
  }

  uploadFiles(filePaths: string[]): FileUploadResult[] {
    const results: FileUploadResult[] = [];
    
    try {
      const { results: processingResults, deviceGroups } = FileProcessingService.processMultipleFiles(filePaths);
      
      for (const [deviceName, files] of deviceGroups.entries()) {
        try {
          const device = this.deviceService.createOrGetDevice(deviceName);
          let readingsAdded = 0;
          const errors: string[] = [];

          for (const file of files) {
            try {
              this.pufReadingService.createReading({
                device_id: device.id,
                filename: file.filename,
                original_filename: file.originalFilename,
                binary_data: file.binaryData,
                file_size: file.fileSize,
                file_extension: file.fileExtension
              });
              readingsAdded++;
            } catch (error) {
              errors.push(`Failed to save reading "${file.filename}": ${error}`);
            }
          }

          results.push({
            success: readingsAdded > 0,
            deviceName,
            readingsAdded,
            errors: errors.length > 0 ? errors : undefined
          });

        } catch (error) {
          results.push({
            success: false,
            deviceName,
            readingsAdded: 0,
            errors: [`Failed to create/find device "${deviceName}": ${error}`]
          });
        }
      }

      const processingErrors = processingResults
        .filter(result => !result.success)
        .map(result => result.error!);

      if (processingErrors.length > 0) {
        results.push({
          success: false,
          deviceName: 'File Processing Errors',
          readingsAdded: 0,
          errors: processingErrors
        });
      }

    } catch (error) {
      results.push({
        success: false,
        deviceName: 'Upload Service Error',
        readingsAdded: 0,
        errors: [`Unexpected error during file upload: ${error}`]
      });
    }

    return results;
  }

  getDeviceReadings(deviceId: number) {
    return this.pufReadingService.getReadingsByDeviceId(deviceId);
  }

  deleteReading(readingId: number): boolean {
    return this.pufReadingService.deleteReading(readingId);
  }

  generateDownloadContent(readingId: number, format: 'bin' | 'txt' = 'bin'): { content: string; filename: string } {
    const reading = this.pufReadingService.getReadingById(readingId);
    const content = FileProcessingService.generateDownloadableContent(reading.binary_data, format);
    const baseFilename = basename(reading.filename, extname(reading.filename));
    const filename = `${baseFilename}.${format}`;
    
    return { content, filename };
  }

  searchReadings(searchTerm: string) {
    return this.pufReadingService.searchReadings(searchTerm);
  }
}