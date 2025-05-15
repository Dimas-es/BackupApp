const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');

// Import fungsi log ke Google Sheets
const { appendLogToGoogleSheet } = require('./googleSheets');

// Nonaktifkan akselerasi hardware
app.disableHardwareAcceleration();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('src/index.html');
}

app.whenReady().then(createWindow);

// Pilih folder (source/target)
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

// Backup manual
ipcMain.handle('backup-now', async (_, source, target) => {
  try {
    if (!fs.existsSync(source)) throw new Error("❌ Folder sumber tidak ditemukan.");
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destFolder = `${target}/backup-${timestamp}`;
    fs.cpSync(source, destFolder, { recursive: true });

    // Kirim ke Google Sheets
    appendLogToGoogleSheet(source, destFolder);

    return `✅ Backup berhasil ke: ${destFolder}`;
  } catch (err) {
    return `❌ Gagal backup: ${err.message}`;
  }
});

// Backup otomatis berdasarkan schedule
ipcMain.handle('set-schedule', (_, rule, source, target) => {
  schedule.scheduleJob(rule, () => {
    try {
      if (!fs.existsSync(source) || !fs.existsSync(target)) return;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const destFolder = `${target}/auto-backup-${timestamp}`;
      fs.cpSync(source, destFolder, { recursive: true });

      // Kirim log update ke UI
      mainWindow.webContents.send('log-update', `🕒 Backup otomatis ke: ${destFolder}`);

      // Kirim ke Google Sheets juga
      appendLogToGoogleSheet(source, destFolder);

    } catch (err) {
      mainWindow.webContents.send('log-update', `❌ Gagal backup otomatis: ${err.message}`);
    }
  });
});
