require('dotenv').config();
const fs = require('fs').promises;
const fsSync = require('fs');
const { google } = require('googleapis');
const open = require('open');
const express = require('express');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token_gsheet.json';
const REDIRECT_PORT = 3001;

const credentials = process.env.GSHEETS_CREDENTIALS_BASE64
  ? JSON.parse(Buffer.from(process.env.GSHEETS_CREDENTIALS_BASE64, 'base64').toString('utf8'))
  : null;

async function appendLogToGoogleSheet(source, target) {
  if (!credentials) {
    console.error('❌ GSHEETS_CREDENTIALS_BASE64 tidak ditemukan di .env');
    return;
  }
  try {
    const auth = await authorize(credentials);
    let spreadsheetId;
    try {
      spreadsheetId = await fs.readFile('spreadsheet_id.txt', 'utf8');
      spreadsheetId = spreadsheetId.trim();
    } catch {
      spreadsheetId = await createSpreadsheet(auth);
      await fs.writeFile('spreadsheet_id.txt', spreadsheetId);
    }
    await writeToSheet(auth, spreadsheetId, source, target);
  } catch (err) {
    console.error('❌ Error in appendLogToGoogleSheet:', err.message);
  }
}

async function authorize(credentials) {
  const { client_secret, client_id } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    `http://localhost:${REDIRECT_PORT}`
  );

  if (fsSync.existsSync(TOKEN_PATH)) {
    const token = await fs.readFile(TOKEN_PATH, 'utf8');
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } else {
    return getNewToken(oAuth2Client);
  }
}

function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const app = express();
    let server;

    app.get('/', (req, res) => {
      const code = req.query.code;
      res.send('<h2>Login berhasil! Anda bisa menutup tab ini dan kembali ke aplikasi.</h2>');
      server.close();

      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('❌ Gagal mengambil token:', err.message);
          reject(err);
          return;
        }
        oAuth2Client.setCredentials(token);
        fs.writeFile(TOKEN_PATH, JSON.stringify(token))
          .then(() => {
            console.log('✅ Token disimpan ke', TOKEN_PATH);
            resolve(oAuth2Client);
          })
          .catch((writeErr) => {
            console.error('❌ Gagal menyimpan token:', writeErr.message);
            reject(writeErr);
          });
      });
    });

    server = app.listen(REDIRECT_PORT, () => {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        redirect_uri: `http://localhost:${REDIRECT_PORT}`
      });
      open(authUrl);
    });
  });
}

async function createSpreadsheet(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const res = await sheets.spreadsheets.create({
      resource: {
        properties: { title: 'Backup Log ' + new Date().toLocaleDateString() }
      }
    });
    const spreadsheetId = res.data.spreadsheetId;
    console.log('✅ Spreadsheet berhasil dibuat!');
    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('Link:', res.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    return spreadsheetId;
  } catch (err) {
    console.error('❌ Gagal membuat spreadsheet:', err.message);
    throw err;
  }
}

async function writeToSheet(auth, spreadsheetId, source, target) {
  const sheets = google.sheets({ version: 'v4', auth });
  const values = [[new Date().toLocaleString(), source, target]];
  const resource = { values };

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource,
    });
    console.log(`✅ Log backup berhasil ditulis ke Google Sheets`);
  } catch (err) {
    console.error('❌ Error saat menulis ke Google Sheets:', err.message);
    throw err;
  }
}

module.exports = { appendLogToGoogleSheet };
