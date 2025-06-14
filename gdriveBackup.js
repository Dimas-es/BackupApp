require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const open = require('open');
const express = require('express');

const TOKEN_PATH = path.join(__dirname, 'token_gdrive.json');
const REDIRECT_PORT = 3000;

// Ambil kredensial langsung dari .env (base64)
const credentials = process.env.GDRIVE_CREDENTIALS_BASE64
  ? JSON.parse(Buffer.from(process.env.GDRIVE_CREDENTIALS_BASE64, 'base64').toString('utf8'))
  : null;

async function getDriveAuth(mainWindow, dialog) {
  if (!credentials) throw new Error('GDRIVE_CREDENTIALS_BASE64 tidak ditemukan di .env');
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, `http://localhost:${REDIRECT_PORT}`);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // Setup express server untuk menangkap kode auth
  const app = express();
  let server;
  const codePromise = new Promise((resolve, reject) => {
    app.get('/', (req, res) => {
      const code = req.query.code;
      res.send('<h2>Login berhasil! Anda bisa menutup tab ini.</h2>');
      server.close();
      resolve(code);
    });
    server = app.listen(REDIRECT_PORT);
  });

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    redirect_uri: `http://localhost:${REDIRECT_PORT}`
  });

  await open(authUrl);

  // Tunggu kode dari browser
  const code = await codePromise;

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return oAuth2Client;
}

async function uploadToDrive(auth, filePath, parentId = null) {
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = {
    name: path.basename(filePath),
    parents: parentId ? [parentId] : []
  };
  const media = {
    body: fs.createReadStream(filePath)
  };
  await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id'
  });
}

// Tambahkan fungsi ini untuk upload folder & subfolder secara rekursif
async function uploadFolderRecursive(auth, folderPath, parentId = null) {
  const drive = google.drive({ version: 'v3', auth });
  const folderName = path.basename(folderPath);

  // Buat folder di Drive
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : []
  };
  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  });
  const newFolderId = folder.data.id;

  // Upload isi folder
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      await uploadToDrive(auth, filePath, newFolderId);
    } else if (stat.isDirectory()) {
      await uploadFolderRecursive(auth, filePath, newFolderId);
    }
  }
}

// Ubah fungsi backupToGDrive agar bisa backup folder beserta subfolder
async function backupToGDrive(mainWindow, dialog, source, parentId = null) {
  if (!fs.existsSync(source)) throw new Error("Folder sumber tidak ditemukan.");
  const auth = await getDriveAuth(mainWindow, dialog);
  let backupFolderId = parentId;
  if (!backupFolderId) {
    backupFolderId = await getOrCreateBackupFolder(auth);
  }
  await uploadFolderRecursive(auth, source, backupFolderId);
  return `✅ Backup ke Google Drive berhasil ke folder BackupApp.`;
}

module.exports = { backupToGDrive };
async function getOrCreateBackupFolder(auth) {
  const drive = google.drive({ version: 'v3', auth });
  // Cari folder bernama "BackupApp" di root
  const res = await drive.files.list({
    q: `name = 'BackupApp' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  // Jika belum ada, buat folder baru
  const fileMetadata = {
    name: 'BackupApp',
    mimeType: 'application/vnd.google-apps.folder',
    parents: ['root']
  };
  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  });
  return folder.data.id;
}

module.exports = { backupToGDrive };