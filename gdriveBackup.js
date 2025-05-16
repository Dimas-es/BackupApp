const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const open = require('open');
const express = require('express');

const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const REDIRECT_PORT = 3000;

async function getDriveAuth(mainWindow, dialog) {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
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

async function uploadFolderToDrive(auth, folderPath, parentId = null) {
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    if (fs.statSync(filePath).isFile()) {
      await uploadToDrive(auth, filePath, parentId);
    }
  }
}

async function backupToGDrive(mainWindow, dialog, source, parentId = null) {
  if (!fs.existsSync(source)) throw new Error("Folder sumber tidak ditemukan.");
  const auth = await getDriveAuth(mainWindow, dialog);
  let backupFolderId = parentId;
  if (!backupFolderId) {
    backupFolderId = await getOrCreateBackupFolder(auth);
  }
  await uploadFolderToDrive(auth, source, backupFolderId);
  return `✅ Backup ke Google Drive berhasil ke folder BackupApp.`;
}
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