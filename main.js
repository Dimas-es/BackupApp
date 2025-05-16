const { backupToGDrive } = require('./gdriveBackup');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');

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

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('backup-now', async (_, source, target) => {
  try {
    if (!fs.existsSync(source)) throw new Error("Folder sumber tidak ditemukan.");
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destFolder = `${target}/backup-${timestamp}`;
    fs.cpSync(source, destFolder, { recursive: true });

    return `✅ Backup berhasil ke: ${destFolder}`;
  } catch (err) {
    return `❌ Gagal backup: ${err.message}`;
  }
});

ipcMain.handle('backup-to-gdrive', async (event, source, target) => {
  try {
    const result = await backupToGDrive(null, null, source, target); // pastikan backupToGDrive menerima 4 argumen
    return result;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
});

ipcMain.handle('set-schedule', (_, rule, source, target) => {
  schedule.scheduleJob(rule, () => {
    if (!fs.existsSync(source) || !fs.existsSync(target)) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destFolder = `${target}/auto-backup-${timestamp}`;
    fs.cpSync(source, destFolder, { recursive: true });

    mainWindow.webContents.send('log-update', `🕒 Backup otomatis ke: ${destFolder}`);
  });
});

ipcMain.handle('list-gdrive-folders', async () => {
  try {
    const auth = await getDriveAuth(); // Pastikan getDriveAuth diekspor juga
    const folders = await listDriveFolders(auth);
    return folders;
  } catch (err) {
    return [];
  }
});

ipcMain.handle('set-gdrive-schedule', (_, rule, source, parentId = null) => {
  schedule.scheduleJob(rule, async () => {
    try {
      const result = await backupToGDrive(null, null, source, parentId);
      mainWindow.webContents.send('log-update', `🕒 Backup otomatis ke Google Drive: ${result}`);
    } catch (err) {
      mainWindow.webContents.send('log-update', `❌ Gagal backup otomatis ke Google Drive: ${err.message}`);
    }
  });
});