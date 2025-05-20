const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'userSheets.json');

function loadUserSheets() {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath));
}

function saveUserSheets(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Cek apakah user sudah punya spreadsheetId.
 * Kalau belum, buat spreadsheet baru pake createSpreadsheetFunc, simpan mappingnya, lalu return spreadsheetId.
 * 
 * @param {string} userId 
 * @param {function} createSpreadsheetFunc fungsi untuk bikin spreadsheet baru
 * @returns {string} spreadsheetId milik user
 */
async function getOrCreateUserSpreadsheet(userId, createSpreadsheetFunc) {
  const userSheets = loadUserSheets();

  if (userSheets[userId]) {
    return userSheets[userId];
  } else {
    const spreadsheetId = await createSpreadsheetFunc(`Backup Log - ${userId}`);
    userSheets[userId] = spreadsheetId;
    saveUserSheets(userSheets);
    return spreadsheetId;
  }
}

module.exports = { getOrCreateUserSpreadsheet };
