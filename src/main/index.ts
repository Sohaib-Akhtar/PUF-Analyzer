import { app, BrowserWindow, shell, session } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { initDatabase, closeDatabase } from '../database/connection';
import { setupIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    title: 'PUF GUI',
    icon: join(__dirname, '../../public/chip.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

// Set app name BEFORE initialization (affects userData path)
app.setName('PUF GUI');

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.puf-analyzer');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Setup security
  setupSecurityPolicies();

  // Initialize database
  try {
    initDatabase();
    console.log('Database initialized successfully');
    
    // Setup IPC handlers only after database is initialized
    setupIpcHandlers();
  } catch (error) {
    console.error('Database initialization failed:', error);
    console.log('Application will start without database functionality');
  }

  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase();
    app.quit();
  }
});

// Close database when app is about to quit
app.on('before-quit', () => {
  closeDatabase();
});

// Security setup function
const setupSecurityPolicies = (): void => {
  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:;"
        ]
      }
    });
  });

  // Block external navigation
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      // Allow navigation to local files and localhost in development
      if (parsedUrl.origin !== 'file://' && 
          !(is.dev && parsedUrl.hostname === 'localhost')) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    });

    // Block new window creation
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  });

  // Prevent eval and new Function
  session.defaultSession.webRequest.onBeforeRequest((_, callback) => {
    callback({});
  });
};

// In this file you can include the rest of your app"s specific main process code.
// You can also put them in separate files and require them here.