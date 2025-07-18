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
    
    // File operations
    createFile: (fileData: any) => ipcRenderer.invoke('database:create-file', fileData),
    getFile: (id: number) => ipcRenderer.invoke('database:get-file', id),
    getAllFiles: () => ipcRenderer.invoke('database:get-all-files'),
    updateFile: (id: number, fileData: any) => ipcRenderer.invoke('database:update-file', id, fileData),
    deleteFile: (id: number) => ipcRenderer.invoke('database:delete-file', id),
  },
  
  // File system operations
  filesystem: {
    selectFile: () => ipcRenderer.invoke('filesystem:select-file'),
    selectDirectory: () => ipcRenderer.invoke('filesystem:select-directory'),
    readFile: (filePath: string) => ipcRenderer.invoke('filesystem:read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('filesystem:write-file', filePath, content),
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