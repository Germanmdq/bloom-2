const { contextBridge, ipcRenderer } = require('electron');

// Exponemos la función de impresión silenciosa al contexto de la página web.
// Cuando la página llame a window.electronAPI.printSilent(), el mensaje
// viaja al proceso principal (main.js), que imprime directo a la impresora
// predeterminada sin mostrar ninguna ventana.
contextBridge.exposeInMainWorld('electronAPI', {
  printSilent: () => ipcRenderer.send('print-silent')
});
