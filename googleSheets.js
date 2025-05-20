require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');
const open = require('open');
const express = require('express');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token_gsheet.json';
const REDIRECT_PORT = 3001;

const credentials = process.env.GSHEETS_CREDENTIALS_BASE64
  ? JSON.parse(Buffer.from(process.env.GSHEETS_CREDENTIALS_BASE64, 'base64').toString('utf8'))
  : null;

function appendLogToGoogleSheet(source, target) {
  if (!credentials) return console.error('❌ GSHEETS_CREDENTIALS_BASE64 tidak ditemukan di .env');
  authorize(credentials, (auth) => {
    if (fs.existsSync('spreadsheet_id.txt')) {
      writeToSheet(auth, source, target);
    } else {
      createSpreadsheet(auth, (spreadsheetId) => {
        fs.writeFileSync('spreadsheet_id.txt', spreadsheetId);
        writeToSheet(auth, source, target);
      });
    }
  });
}

function authorize(credentials, callback) {
  const { client_secret, client_id } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    `http://localhost:${REDIRECT_PORT}`
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  } else {
    getNewToken(oAuth2Client, callback);
  }
}

function getNewToken(oAuth2Client, callback) {
  const app = express();
  let server;

  app.get('/', (req, res) => {
    const code = req.query.code;
    res.send('<h2>Login berhasil! Anda bisa menutup tab ini dan kembali ke aplikasi.</h2>');
    server.close();

    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('❌ Gagal mengambil token:', err.message);
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log('✅ Token disimpan ke', TOKEN_PATH);
      callback(oAuth2Client);
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
}

function createSpreadsheet(auth, callback) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.create({
    resource: {
      properties: { title: 'Backup Log ' + new Date().toLocaleDateString() }
    }
  }, (err, res) => {
    if (err) return console.error('❌ Gagal membuat spreadsheet:', err);
    const spreadsheetId = res.data.spreadsheetId;
    console.log('✅ Spreadsheet berhasil dibuat!');
    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('Link:', res.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    if (callback) callback(spreadsheetId);
  });
}

function writeToSheet(auth, source, target) {
  const sheets = google.sheets({ version: 'v4', auth });
  let spreadsheetId;
  try {
    spreadsheetId = fs.readFileSync('spreadsheet_id.txt', 'utf8').trim();
  } catch (e) {
    return console.error('❌ spreadsheet_id.txt tidak ditemukan. Backup gagal.');
  }
  const values = [[new Date().toLocaleString(), source, target]];
  const resource = { values };

  sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    resource,
  }, (err, res) => {
    if (err) return console.error('❌ Error saat menulis ke Google Sheets:', err.message);
    console.log(`✅ Log backup berhasil ditulis ke Google Sheets`);
  });
}

module.exports = { appendLogToGoogleSheet };