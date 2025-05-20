const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');

// Scope buat akses Google Sheets
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Tempat token disimpan setelah login pertama kali
const TOKEN_PATH = 'token.json';

/**
 * Fungsi utama yang bisa dipanggil di main.js
 */
function appendLogToGoogleSheet(source, target) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.error('❌ Gagal membaca credentials.json:', err);
    authorize(JSON.parse(content), (auth) => writeToSheet(auth, source, target));
  });
}

/**
 * Fungsi untuk otorisasi OAuth
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Cek apakah token sudah pernah disimpan
  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  } else {
    getNewToken(oAuth2Client, callback);
  }
}

/**
 * Fungsi untuk mendapatkan token OAuth baru
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🔐 Buka URL ini untuk login ke Google dan dapatkan kodenya:\n', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('👉 Masukkan kode autentikasi di sini: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('❌ Gagal mengambil token:', err.message);
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log('✅ Token disimpan ke', TOKEN_PATH);
      callback(oAuth2Client);
    });
  });
}

/**
 * Fungsi untuk menulis data ke Google Sheets
 */
function writeToSheet(auth, source, target) {
  const sheets = google.sheets({ version: 'v4', auth });

  const values = [[new Date().toLocaleString(), source, target]];
  const resource = { values };

  sheets.spreadsheets.values.append({
    spreadsheetId: '1Zd9w4mCHS-CrxlmeZahW2GXgFhuLRS-GuG_efYmLmqM', // 🔁 GANTI di sini
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    resource,
  }, (err, res) => {
    if (err) return console.error('❌ Error saat menulis ke Google Sheets:', err.message);
    console.log(`✅ Log backup berhasil ditulis ke Google Sheets (${res.data.updates.updatedCells} sel)`);
  });
}

module.exports = { appendLogToGoogleSheet };
