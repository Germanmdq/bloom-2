const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.maximize();
  
  // Ocultar el menú superior para que parezca una app real
  mainWindow.setMenuBarVisibility(false);

  // Cargamos la página
  mainWindow.loadURL('https://bloommdp.com/dashboard/tables');

  // Cada vez que la página termine de cargar, inyectamos el override de window.print
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.print = function() {
        if (window.electronAPI && window.electronAPI.printSilent) {
          window.electronAPI.printSilent();
        }
      };
      console.log('[Bloom Desktop] window.print interceptado ✓');
    `);
  });

  // También para navegaciones internas (SPA)
  mainWindow.webContents.on('did-navigate-in-page', () => {
    mainWindow.webContents.executeJavaScript(`
      window.print = function() {
        if (window.electronAPI && window.electronAPI.printSilent) {
          window.electronAPI.printSilent();
        }
      };
    `);
  });

  // Interceptamos la orden de imprimir y la hacemos 100% silenciosa
  ipcMain.on('print-silent', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.print(
        { silent: true, printBackground: true },
        (success, failureReason) => {
          if (!success) console.log('[Bloom Desktop] Error imprimiendo:', failureReason);
          else console.log('[Bloom Desktop] Impresión silenciosa OK ✓');
        }
      );
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
