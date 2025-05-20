// require('dotenv').config();
// const fs = require('fs');
// const readline = require('readline');
// const { google } = require('googleapis');

// const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// const TOKEN_PATH = 'token_gsheets.json';

// // Ambil credentials dari .env (base64)
// const base64 = process.env.GSHEETS_CREDENTIALS_BASE64;
// if (!base64) {
//   console.error('❌ GSHEETS_CREDENTIALS_BASE64 tidak ditemukan di .env');
//   process.exit(1);
// }
// const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
// authorize(credentials);
// function authorize(credentials) {
//   const { client_secret, client_id, redirect_uris } = credentials.installed;
//   const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

//   const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: SCOPES,
//   });

//   console.log('🔗  linkBuka ini di browser dan ambil kode-nya:\n', authUrl);

//   const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

//   rl.question('⏳ Masukkan kode autentikasi: ', (code) => {
//     rl.close();
//     oAuth2Client.getToken(code, (err, token) => {
//       if (err) return console.error('❌ Error ambil token:', err);
//       fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
//       console.log('✅ Token disimpan di', TOKEN_PATH);
//     });
//   });
// }

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

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
    });
  });
}
