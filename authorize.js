const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token_gsheet.json';

fs.readFile('credentials.json', (err, content) => {
  if (err) return console.error('Error loading client secret file:', err);
  authorize(JSON.parse(content));
});

function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🔗 Buka link ini di browser dan ambil kode-nya:\n', authUrl);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('⏳ Masukkan kode autentikasi: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('❌ Error ambil token:', err);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log('✅ Token disimpan di', TOKEN_PATH);

      // Tambahkan kode berikut untuk membuat spreadsheet baru
      createSpreadsheet(oAuth2Client);
    });
  });
}

function createSpreadsheet(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.create({
    resource: {
      properties: {
        title: 'Spreadsheet Baru User Ini'
      }
    }
  }, (err, res) => {
    if (err) return console.error('❌ Gagal membuat spreadsheet:', err);
    console.log('✅ Spreadsheet berhasil dibuat!');
    console.log('Spreadsheet ID:', res.data.spreadsheetId);
    console.log('Link:', res.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${res.data.spreadsheetId}`);
  });
}