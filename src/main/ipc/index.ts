import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { getDatabase, resetDatabase } from '../../database/connection';
import { DeviceService } from '../../database/services/deviceService';
import { PufReadingService } from '../../database/services/pufReadingService';
import { FileUploadService } from '../../database/services/fileUploadService';
import { CreateDeviceDto } from '../../shared/types/database';

export const setupIpcHandlers = (): void => {
  let db: any = null;
  let deviceService: DeviceService | null = null;
  let pufReadingService: PufReadingService | null = null;
  let fileUploadService: FileUploadService | null = null;
  
  try {
    db = getDatabase();
    deviceService = new DeviceService(db);
    pufReadingService = new PufReadingService(db);
    fileUploadService = new FileUploadService(db);
  } catch (error) {
    console.warn('Database not available for IPC handlers');
  }

  // App info handlers
  ipcMain.handle('get-app-version', () => {
    return process.env['npm_package_version'] || '1.0.0';
  });

  ipcMain.handle('get-platform', () => {
    return process.platform;
  });

  ipcMain.handle('get-api-server-url', () => {
    return process.env['PUF_API_URL'] || null;
  });

  ipcMain.handle('get-api-server-port', () => {
    return process.env['PUF_API_PORT'] || null;
  });

  // Device database operations
  ipcMain.handle('database:create-device', async (_, deviceData: CreateDeviceDto) => {
    if (!deviceService) {
      throw new Error('Database not available');
    }
    try {
      return deviceService.createDevice(deviceData);
    } catch (error) {
      throw new Error(`Failed to create device: ${error}`);
    }
  });

  ipcMain.handle('database:get-device', async (_, id: number) => {
    if (!deviceService) {
      throw new Error('Database not available');
    }
    try {
      return deviceService.getDeviceById(id);
    } catch (error) {
      throw new Error(`Failed to get device: ${error}`);
    }
  });

  ipcMain.handle('database:get-all-devices', async () => {
    if (!deviceService) {
      throw new Error('Database not available');
    }
    try {
      return deviceService.getAllDevices();
    } catch (error) {
      throw new Error(`Failed to get devices: ${error}`);
    }
  });

  ipcMain.handle('database:update-device', async (_, id: number, deviceData: Partial<CreateDeviceDto>) => {
    if (!deviceService) {
      throw new Error('Database not available');
    }
    try {
      return deviceService.updateDevice(id, deviceData);
    } catch (error) {
      throw new Error(`Failed to update device: ${error}`);
    }
  });

  ipcMain.handle('database:delete-device', async (_, id: number) => {
    if (!deviceService) {
      throw new Error('Database not available');
    }
    try {
      return deviceService.deleteDevice(id);
    } catch (error) {
      throw new Error(`Failed to delete device: ${error}`);
    }
  });

  ipcMain.handle('database:search-devices', async (_, searchTerm: string) => {
    if (!deviceService) {
      throw new Error('Database not available');
    }
    try {
      return deviceService.searchDevices(searchTerm);
    } catch (error) {
      throw new Error(`Failed to search devices: ${error}`);
    }
  });

  // PUF Reading operations
  ipcMain.handle('database:get-device-readings', async (_, deviceId: number) => {
    if (!pufReadingService) {
      throw new Error('Database not available');
    }
    try {
      return pufReadingService.getReadingsByDeviceId(deviceId);
    } catch (error) {
      throw new Error(`Failed to get device readings: ${error}`);
    }
  });

  ipcMain.handle('database:get-device-with-readings', async (_, deviceId: number) => {
    if (!deviceService) {
      throw new Error('Database not available');
    }
    try {
      return deviceService.getDeviceWithReadings(deviceId);
    } catch (error) {
      throw new Error(`Failed to get device with readings: ${error}`);
    }
  });

  ipcMain.handle('database:delete-reading', async (_, readingId: number) => {
    if (!pufReadingService) {
      throw new Error('Database not available');
    }
    try {
      return pufReadingService.deleteReading(readingId);
    } catch (error) {
      throw new Error(`Failed to delete reading: ${error}`);
    }
  });

  ipcMain.handle('database:search-readings', async (_, searchTerm: string) => {
    if (!pufReadingService) {
      throw new Error('Database not available');
    }
    try {
      return pufReadingService.searchReadings(searchTerm);
    } catch (error) {
      throw new Error(`Failed to search readings: ${error}`);
    }
  });

  ipcMain.handle('database:get-reading-count', async () => {
    if (!pufReadingService) {
      throw new Error('Database not available');
    }
    try {
      return pufReadingService.getReadingCount();
    } catch (error) {
      throw new Error(`Failed to get reading count: ${error}`);
    }
  });

  ipcMain.handle('database:reset', async () => {
    try {
      resetDatabase();
      
      db = getDatabase();
      deviceService = new DeviceService(db);
      pufReadingService = new PufReadingService(db);
      fileUploadService = new FileUploadService(db);
      
      return { success: true, message: 'Database reset successfully' };
    } catch (error) {
      throw new Error(`Failed to reset database: ${error}`);
    }
  });

  // File system operations
  // File upload operations
  ipcMain.handle('filesystem:upload-puf-files', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'PUF Files', extensions: ['bin', 'txt'] },
          { name: 'Binary Files', extensions: ['bin'] },
          { name: 'Text Files', extensions: ['txt'] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        if (!fileUploadService) {
          throw new Error('File upload service not available');
        }
        return fileUploadService.uploadFiles(result.filePaths);
      }
      return [];
    } catch (error) {
      throw new Error(`Failed to upload PUF files: ${error}`);
    }
  });

  ipcMain.handle('filesystem:download-reading', async (_, readingId: number, format: 'bin' | 'txt' = 'bin') => {
    try {
      if (!fileUploadService) {
        throw new Error('File upload service not available');
      }
      
      const { content, filename } = fileUploadService.generateDownloadContent(readingId, format);
      
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [
          { name: format.toUpperCase() + ' Files', extensions: [format] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePath) {
        await writeFile(result.filePath, content, 'utf8');
        return result.filePath;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to download reading: ${error}`);
    }
  });

  ipcMain.handle('filesystem:select-file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'csv', 'json'] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to select file: ${error}`);
    }
  });

  ipcMain.handle('filesystem:select-directory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to select directory: ${error}`);
    }
  });

  ipcMain.handle('filesystem:read-file', async (_, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  });

  ipcMain.handle('filesystem:write-file', async (_, filePath: string, content: string) => {
    try {
      await writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }
  });
};