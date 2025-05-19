require('dotenv').config();
const { google } = require('googleapis');

// Ambil service account dari .env (base64)
const base64 = process.env.SERVICE_ACCOUNT_BASE64;
if (!base64) {
  throw new Error('SERVICE_ACCOUNT_BASE64 tidak ditemukan di .env');
}
const keys = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

const auth = new google.auth.JWT({
  email: keys.client_email,
  key: keys.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function appendLogToGoogleSheet(source, target) {
  try {
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const values = [[new Date().toLocaleString(), source, target]];
    const resource = { values };

    await sheets.spreadsheets.values.append({
      spreadsheetId: '1Zd9w4mCHS-CrxlmeZahW2GXgFhuLRS-GuG_efYmLmqM', // ID spreadsheet kamu
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource,
    });

    console.log('✅ Log backup berhasil ditulis ke Google Sheets (via Service Account)');
  } catch (err) {
    console.error('❌ Gagal menulis ke Google Sheets:', err.message);
  }
}

module.exports = { appendLogToGoogleSheet };
