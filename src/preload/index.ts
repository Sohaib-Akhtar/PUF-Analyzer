import { contextBridge, ipcRenderer } from 'electron';

// Custom APIs for renderer
const api = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
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