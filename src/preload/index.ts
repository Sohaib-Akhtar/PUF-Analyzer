import { contextBridge, ipcRenderer } from 'electron';

// Custom APIs for renderer
const api = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getApiServerUrl: () => ipcRenderer.invoke('get-api-server-url'),
  getApiServerPort: () => ipcRenderer.invoke('get-api-server-port'),
  
  // Database operations
  database: {
    // Device operations
    createDevice: (deviceData: any) => ipcRenderer.invoke('database:create-device', deviceData),
    getDevice: (id: number) => ipcRenderer.invoke('database:get-device', id),
    getAllDevices: () => ipcRenderer.invoke('database:get-all-devices'),
    updateDevice: (id: number, deviceData: any) => ipcRenderer.invoke('database:update-device', id, deviceData),
    deleteDevice: (id: number) => ipcRenderer.invoke('database:delete-device', id),
    searchDevices: (searchTerm: string) => ipcRenderer.invoke('database:search-devices', searchTerm),
    getDeviceWithReadings: (deviceId: number) => ipcRenderer.invoke('database:get-device-with-readings', deviceId),
    
    // PUF Reading operations
    getDeviceReadings: (deviceId: number) => ipcRenderer.invoke('database:get-device-readings', deviceId),
    deleteReading: (readingId: number) => ipcRenderer.invoke('database:delete-reading', readingId),
    searchReadings: (searchTerm: string) => ipcRenderer.invoke('database:search-readings', searchTerm),
    getReadingCount: () => ipcRenderer.invoke('database:get-reading-count'),
    resetDatabase: () => ipcRenderer.invoke('database:reset'),
  },
  
  // File system operations
  filesystem: {
    selectFile: () => ipcRenderer.invoke('filesystem:select-file'),
    selectDirectory: () => ipcRenderer.invoke('filesystem:select-directory'),
    readFile: (filePath: string) => ipcRenderer.invoke('filesystem:read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('filesystem:write-file', filePath, content),
    uploadPufFiles: () => ipcRenderer.invoke('filesystem:upload-puf-files'),
    downloadReading: (readingId: number, format: 'bin' | 'txt') => ipcRenderer.invoke('filesystem:download-reading', readingId, format),
    saveGeneratedFile: (filename: string, base64Content: string) => ipcRenderer.invoke('filesystem:save-generated-file', filename, base64Content),
    saveGeneratedFiles: (files: Array<{ filename: string; content: string }>) => ipcRenderer.invoke('filesystem:save-generated-files', files),
  },

  // Analysis operations (Java CLI bridge)
  analysis: {
    // Core PUF operations
    runMetrics: (params: any) => ipcRenderer.invoke('analysis:run-metrics', params),
    generateStable: (params: any) => ipcRenderer.invoke('analysis:generate-stable', params),
    extractKey: (params: any) => ipcRenderer.invoke('analysis:extract-key', params),

    // Conversion operations
    convertBinary: (params: any) => ipcRenderer.invoke('analysis:convert-binary', params),
    convertHex: (params: any) => ipcRenderer.invoke('analysis:convert-hex', params),
    convertImage: (params: any) => ipcRenderer.invoke('analysis:convert-image', params),

    // Data manipulation
    augmentData: (params: any) => ipcRenderer.invoke('analysis:augment-data', params),
    corruptData: (params: any) => ipcRenderer.invoke('analysis:corrupt-data', params),
    fixLineFeeds: (params: any) => ipcRenderer.invoke('analysis:fix-line-feeds', params),

    // NIST tests
    nistAverage: (params: any) => ipcRenderer.invoke('analysis:nist-average', params),

    // Data generation
    generateRandom: (params: any) => ipcRenderer.invoke('analysis:generate-random', params),
    generateRepeated: (params: any) => ipcRenderer.invoke('analysis:generate-repeated', params),

    // Analysis persistence
    saveResult: (data: any) => ipcRenderer.invoke('analysis:save-result', data),
    getResult: (id: number) => ipcRenderer.invoke('analysis:get-result', id),
    getDeviceHistory: (deviceId: number) => ipcRenderer.invoke('analysis:get-device-history', deviceId),
    getRecent: (limit?: number) => ipcRenderer.invoke('analysis:get-recent', limit),
    getHistory: (limit?: number) => ipcRenderer.invoke('analysis:get-history', limit || 100),
    getCount: () => ipcRenderer.invoke('analysis:get-count'),
    deleteResult: (id: number) => ipcRenderer.invoke('analysis:delete-result', id),
    search: (searchTerm: string) => ipcRenderer.invoke('analysis:search', searchTerm),
  }
};

// Use `contextBridge` APIs to expose Electron APIs to renderer process
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api);
  } catch (error) {
    console.error('Failed to expose electron API:', error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = api;
}

// Types for the exposed API
export type ElectronAPI = typeof api;