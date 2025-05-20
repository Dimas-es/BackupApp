const { backupToGDrive } = require('./gdriveBackup');
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
    mainWindow.webContents.send('log-update', '⏳ Memulai proses backup lokal...');
    if (!fs.existsSync(source)) throw new Error("❌ Folder sumber tidak ditemukan.");
    if (!target || typeof target !== 'string' || target.trim() === '') throw new Error("❌ Folder target belum dipilih.");
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destFolder = `${target}/backup-${timestamp}`;
    fs.cpSync(source, destFolder, { recursive: true });

    mainWindow.webContents.send('log-update', '⏳ Menulis log ke Google Sheets...');
    await appendLogToGoogleSheet(source, destFolder);

    mainWindow.webContents.send('log-update', `✅ Backup selesai ke: ${destFolder}`);
    return `✅ Backup berhasil ke: ${destFolder}`;
  } catch (err) {
    mainWindow.webContents.send('log-update', `❌ Gagal backup: ${err.message}`);
    return `❌ Gagal backup: ${err.message}`;
  }
});

// Backup ke Google Drive
ipcMain.handle('backup-to-gdrive', async (event, source, target) => {
  try {
    mainWindow.webContents.send('log-update', '⏳ Memulai backup ke Google Drive...');
    const result = await backupToGDrive(null, null, source, target);

    mainWindow.webContents.send('log-update', '⏳ Menulis log ke Google Sheets...');
    await appendLogToGoogleSheet(source, 'Google Drive');

    mainWindow.webContents.send('log-update', `✅ Backup ke Google Drive selesai.`);
    return result;
  } catch (err) {
    mainWindow.webContents.send('log-update', `❌ Error: ${err.message}`);
    return `❌ Error: ${err.message}`;
  }
});

ipcMain.handle('set-gdrive-schedule', (_, rule, source, parentId = null) => {
  schedule.scheduleJob(rule, async () => {
    try {
      const result = await backupToGDrive(null, null, source, parentId);
      mainWindow.webContents.send('log-update', `🕒 Backup otomatis ke Google Drive: ${result}`);
      // Catat ke Google Sheets juga
      await appendLogToGoogleSheet(source, 'Google Drive');
    } catch (err) {
      mainWindow.webContents.send('log-update', `❌ Gagal backup otomatis ke Google Drive: ${err.message}`);
    }
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

ipcMain.handle('getSpreadsheetId', async () => {
  try {
    const id = fs.readFileSync('spreadsheet_id.txt', 'utf8').trim();
    return id;
  } catch {
    return null;
  }
});
