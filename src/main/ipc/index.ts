import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { getDatabase } from '../../database/connection';
import { UserService } from '../../database/services/userService';
import { CreateUserDto, CreateDeviceDto, CreateFileDto } from '../../shared/types/database';

export const setupIpcHandlers = (): void => {
  let db: any = null;
  let userService: UserService | null = null;
  
  try {
    db = getDatabase();
    userService = new UserService(db);
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

  // User database operations
  ipcMain.handle('database:create-user', async (_, userData: CreateUserDto) => {
    if (!userService) {
      throw new Error('Database not available');
    }
    try {
      return await userService.createUser(userData);
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  });

  ipcMain.handle('database:get-user', async (_, id: number) => {
    if (!userService) {
      throw new Error('Database not available');
    }
    try {
      return userService.getUserById(id);
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  });

  ipcMain.handle('database:get-all-users', async () => {
    if (!userService) {
      throw new Error('Database not available');
    }
    try {
      return userService.getAllUsers();
    } catch (error) {
      throw new Error(`Failed to get users: ${error}`);
    }
  });

  ipcMain.handle('database:update-user', async (_, id: number, userData: Partial<CreateUserDto>) => {
    if (!userService) {
      throw new Error('Database not available');
    }
    try {
      return userService.updateUser(id, userData);
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  });

  ipcMain.handle('database:delete-user', async (_, id: number) => {
    if (!userService) {
      throw new Error('Database not available');
    }
    try {
      return userService.deleteUser(id);
    } catch (error) {
      throw new Error(`Failed to delete user: ${error}`);
    }
  });

  // Device database operations (placeholder - to be implemented)
  ipcMain.handle('database:create-device', async (_, deviceData: CreateDeviceDto) => {
    // TODO: Implement device service
    throw new Error('Device operations not implemented yet');
  });

  ipcMain.handle('database:get-device', async (_, id: number) => {
    // TODO: Implement device service
    throw new Error('Device operations not implemented yet');
  });

  ipcMain.handle('database:get-all-devices', async () => {
    // TODO: Implement device service
    throw new Error('Device operations not implemented yet');
  });

  ipcMain.handle('database:update-device', async (_, id: number, deviceData: Partial<CreateDeviceDto>) => {
    // TODO: Implement device service
    throw new Error('Device operations not implemented yet');
  });

  ipcMain.handle('database:delete-device', async (_, id: number) => {
    // TODO: Implement device service
    throw new Error('Device operations not implemented yet');
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