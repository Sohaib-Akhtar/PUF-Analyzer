import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { getDatabase, resetDatabase } from '../../database/connection';
import { DeviceService } from '../../database/services/deviceService';
import { PufReadingService } from '../../database/services/pufReadingService';
import { FileUploadService } from '../../database/services/fileUploadService';
import { AnalysisService } from '../../database/services/analysisService';
import { JavaCliService } from '../api/services/javaCliService';
import { CreateDeviceDto, CreatePufAnalysisDto } from '../../shared/types/database';

export const setupIpcHandlers = (): void => {
  let db: any = null;
  let deviceService: DeviceService | null = null;
  let pufReadingService: PufReadingService | null = null;
  let fileUploadService: FileUploadService | null = null;
  let analysisService: AnalysisService | null = null;
  const javaCliService = new JavaCliService();
  
  try {
    db = getDatabase();
    deviceService = new DeviceService(db);
    pufReadingService = new PufReadingService(db);
    fileUploadService = new FileUploadService(db);
    analysisService = new AnalysisService(db);
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
      analysisService = new AnalysisService(db);
      
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

  // Save a single generated file via native save dialog
  ipcMain.handle('filesystem:save-generated-file', async (_, filename: string, base64Content: string) => {
    try {
      const ext = filename.split('.').pop() || '*';
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [
          { name: ext.toUpperCase() + ' Files', extensions: [ext] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePath) {
        const buffer = Buffer.from(base64Content, 'base64');
        await writeFile(result.filePath, buffer);
        return result.filePath;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to save file: ${error}`);
    }
  });

  // Save multiple generated files to a chosen directory
  ipcMain.handle('filesystem:save-generated-files', async (_, files: Array<{ filename: string; content: string }>) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select folder to save generated files',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const dir = result.filePaths[0];
        const { join } = await import('path');
        const saved: string[] = [];
        for (const file of files) {
          const outPath = join(dir, file.filename);
          const buffer = Buffer.from(file.content, 'base64');
          await writeFile(outPath, buffer);
          saved.push(outPath);
        }
        return saved;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to save files: ${error}`);
    }
  });

  // ──────────────────────────────────────────────
  // Analysis operations (bridge to Java CLI)
  // ──────────────────────────────────────────────

  const buildFileDto = (filePaths: string[], fileContents: Buffer[]) =>
    filePaths.map((fp, i) => ({
      name: fp.split(/[\\/]/).pop()!,
      data: fileContents[i],
      size: fileContents[i].length
    }));

  ipcMain.handle('analysis:run-metrics', async (_, params: {
    files: Array<{ name: string; data: string; size: number }>;
    onlyTotal?: boolean;
    startIndicator?: string;
    initValue?: string;
    jobs?: number;
  }) => {
    try {
      const { files: rawFiles, ...rest } = params;
      const files = rawFiles.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.executeMetrics({ ...rest, files });
    } catch (error) {
      throw new Error(`Failed to run metrics: ${error}`);
    }
  });

  ipcMain.handle('analysis:generate-stable', async (_, params: {
    files: Array<{ name: string; data: string; size: number }>;
    keyLength: number;
  }) => {
    try {
      const files = params.files.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.generateStable({ files, keyLength: params.keyLength });
    } catch (error) {
      throw new Error(`Failed to generate stable positions: ${error}`);
    }
  });

  ipcMain.handle('analysis:extract-key', async (_, params: {
    binFile: { name: string; data: string; size: number };
    stableFile: { name: string; data: string; size: number };
  }) => {
    try {
      const binFile = { name: params.binFile.name, data: Buffer.from(params.binFile.data, 'base64'), size: params.binFile.size };
      const stableFile = { name: params.stableFile.name, data: Buffer.from(params.stableFile.data, 'base64'), size: params.stableFile.size };
      return await javaCliService.extractKey({ binFile, stableFile });
    } catch (error) {
      throw new Error(`Failed to extract key: ${error}`);
    }
  });

  ipcMain.handle('analysis:convert-binary', async (_, params: {
    files?: Array<{ name: string; data: string; size: number }>;
    input?: string;
    from: 'bin' | 'txt';
    line?: boolean;
  }) => {
    try {
      const { files: rawFiles, ...rest } = params;
      const files = rawFiles?.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.convertBinary({ ...rest, files });
    } catch (error) {
      throw new Error(`Failed to convert binary: ${error}`);
    }
  });

  ipcMain.handle('analysis:convert-hex', async (_, params: {
    files?: Array<{ name: string; data: string; size: number }>;
    input?: string;
    from: 'hex' | 'txt';
    line?: boolean;
  }) => {
    try {
      const { files: rawFiles, ...rest } = params;
      const files = rawFiles?.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.convertHex({ ...rest, files });
    } catch (error) {
      throw new Error(`Failed to convert hex: ${error}`);
    }
  });

  ipcMain.handle('analysis:convert-image', async (_, params: {
    files: Array<{ name: string; data: string; size: number }>;
    from: 'bin' | 'img';
    imageWidth?: number;
    imageHeight?: number;
  }) => {
    try {
      const files = params.files.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.convertImage({ files, from: params.from, imageWidth: params.imageWidth, imageHeight: params.imageHeight });
    } catch (error) {
      throw new Error(`Failed to convert image: ${error}`);
    }
  });

  ipcMain.handle('analysis:augment-data', async (_, params: {
    files: Array<{ name: string; data: string; size: number }>;
    flipChance0?: number;
    flipChance1?: number;
    augmentFactor?: number;
    bits?: number;
    regenOriginal?: boolean;
    deleteOriginal?: boolean;
    suffix?: string;
  }) => {
    try {
      const { files: rawFiles, ...rest } = params;
      const files = rawFiles.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.augmentData({ ...rest, files });
    } catch (error) {
      throw new Error(`Failed to augment data: ${error}`);
    }
  });

  ipcMain.handle('analysis:corrupt-data', async (_, params: {
    files: Array<{ name: string; data: string; size: number }>;
    corruptPercentage?: number;
    bits?: number;
    regenOriginal?: boolean;
    deleteOriginal?: boolean;
  }) => {
    try {
      const { files: rawFiles, ...rest } = params;
      const files = rawFiles.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.corruptData({ ...rest, files });
    } catch (error) {
      throw new Error(`Failed to corrupt data: ${error}`);
    }
  });

  ipcMain.handle('analysis:fix-line-feeds', async (_, params: {
    files: Array<{ name: string; data: string; size: number }>;
    outSuffix?: string;
  }) => {
    try {
      const files = params.files.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.fixLineFeeds({ files, outSuffix: params.outSuffix });
    } catch (error) {
      throw new Error(`Failed to fix line feeds: ${error}`);
    }
  });

  ipcMain.handle('analysis:nist-average', async (_, params: {
    files: Array<{ name: string; data: string; size: number }>;
    outFile?: string;
  }) => {
    try {
      const files = params.files.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));
      return await javaCliService.nistAverage({ files, outFile: params.outFile });
    } catch (error) {
      throw new Error(`Failed to compute NIST average: ${error}`);
    }
  });

  ipcMain.handle('analysis:generate-random', async (_, params: {
    filenames?: string[];
    hammingWeightMultiplier?: number;
    hammingWeight?: number;
    bits?: number;
  }) => {
    try {
      return await javaCliService.generateRandom(params);
    } catch (error) {
      throw new Error(`Failed to generate random data: ${error}`);
    }
  });

  ipcMain.handle('analysis:generate-repeated', async (_, params: {
    filename?: string;
    bits?: number;
    data?: string;
  }) => {
    try {
      return await javaCliService.generateRepeated(params);
    } catch (error) {
      throw new Error(`Failed to generate repeated data: ${error}`);
    }
  });

  // ──────────────────────────────────────────────
  // Analysis persistence operations
  // ──────────────────────────────────────────────

  ipcMain.handle('analysis:save-result', async (_, data: CreatePufAnalysisDto) => {
    if (!analysisService) throw new Error('Database not available');
    try {
      return analysisService.createAnalysis(data);
    } catch (error) {
      throw new Error(`Failed to save analysis result: ${error}`);
    }
  });

  ipcMain.handle('analysis:get-result', async (_, id: number) => {
    if (!analysisService) throw new Error('Database not available');
    try {
      return analysisService.getAnalysisWithFiles(id);
    } catch (error) {
      throw new Error(`Failed to get analysis result: ${error}`);
    }
  });

  ipcMain.handle('analysis:get-device-history', async (_, deviceId: number) => {
    if (!analysisService) throw new Error('Database not available');
    try {
      return analysisService.getDeviceAnalysisHistory(deviceId);
    } catch (error) {
      throw new Error(`Failed to get device analysis history: ${error}`);
    }
  });

  ipcMain.handle('analysis:get-recent', async (_, limit: number = 10) => {
    if (!analysisService) throw new Error('Database not available');
    try {
      return analysisService.getRecentAnalyses(limit);
    } catch (error) {
      throw new Error(`Failed to get recent analyses: ${error}`);
    }
  });

  ipcMain.handle('analysis:get-history', async (_, limit: number = 100) => {
    if (!analysisService) throw new Error('Database not available');
    try {
      return analysisService.getAnalysisHistory(limit);
    } catch (error) {
      throw new Error(`Failed to get analysis history: ${error}`);
    }
  });

  ipcMain.handle('analysis:get-count', async () => {
    if (!analysisService) throw new Error('Database not available');
    try {
      return analysisService.getAnalysisCount();
    } catch (error) {
      throw new Error(`Failed to get analysis count: ${error}`);
    }
  });

  ipcMain.handle('analysis:delete-result', async (_, id: number) => {
    if (!analysisService) throw new Error('Database not available');
    try {
      return analysisService.deleteAnalysis(id);
    } catch (error) {
      throw new Error(`Failed to delete analysis result: ${error}`);
    }
  });

  ipcMain.handle('analysis:search', async (_, searchTerm: string) => {
    if (!analysisService) throw new Error('Database not available');
    try {
      return analysisService.searchAnalyses(searchTerm);
    } catch (error) {
      throw new Error(`Failed to search analyses: ${error}`);
    }
  });
};