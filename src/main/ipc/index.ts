import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { getDatabase } from '../../database/connection';
import { DeviceService } from '../../database/services/deviceService';
import { CreateDeviceDto, CreateFileDto } from '../../shared/types/database';

export const setupIpcHandlers = (): void => {
  let db: any = null;
  let deviceService: DeviceService | null = null;
  
  try {
    db = getDatabase();
    deviceService = new DeviceService(db);
  } catch (error) {
    console.warn('Database not available for IPC handlers');
  }

  // App info handlers
  ipcMain.handle('get-app-version', () => {
    return process.env.npm_package_version || '1.0.0';
  });

  ipcMain.handle('get-platform', () => {
    return process.platform;
  });

  // Device database operations
  ipcMain.handle('database:create-device', async (_, deviceData: CreateDeviceDto) => {
    if (!deviceService) {
      throw new Error('Database not available');
    }
    try {
      return await deviceService.createDevice(deviceData);
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

  // File database operations (placeholder - to be implemented)
  ipcMain.handle('database:create-file', async (_, fileData: CreateFileDto) => {
    // TODO: Implement file service
    throw new Error('File operations not implemented yet');
  });

  ipcMain.handle('database:get-file', async (_, id: number) => {
    // TODO: Implement file service
    throw new Error('File operations not implemented yet');
  });

  ipcMain.handle('database:get-all-files', async () => {
    // TODO: Implement file service
    throw new Error('File operations not implemented yet');
  });

  ipcMain.handle('database:update-file', async (_, id: number, fileData: Partial<CreateFileDto>) => {
    // TODO: Implement file service
    throw new Error('File operations not implemented yet');
  });

  ipcMain.handle('database:delete-file', async (_, id: number) => {
    // TODO: Implement file service
    throw new Error('File operations not implemented yet');
  });

  // File system operations
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