const { app, BrowserWindow } = require('electron');
const path = require('path');

const query = {
  screensaver: true,
};

// Crear la ventana del screensaver
function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true, // Pantalla completa
    frame: false, // Sin borde
    kiosk: true, // Modo kiosco
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, '../../dist/index.html'), { query });
}

// Al iniciar la aplicación
app.whenReady().then(createWindow);

// Cerrar la aplicación cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Reabrir la ventana en macOS
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
