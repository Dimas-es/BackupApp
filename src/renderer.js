document.getElementById('selectSource').onclick = async () => {
  const path = await window.electronAPI.selectFolder();
  document.getElementById('sourcePath').value = path;
};

document.getElementById('selectTarget').onclick = async () => {
  const path = await window.electronAPI.selectFolder();
  document.getElementById('targetPath').value = path;
};

document.getElementById('manualBackup').onclick = async () => {
  const source = document.getElementById('sourcePath').value;
  const target = document.getElementById('targetPath').value;
  const result = await window.electronAPI.backupNow(source, target);
  appendLog(result);
};

document.getElementById('autoBackup').onclick = async () => {
  const source = document.getElementById('sourcePath').value;
  const target = document.getElementById('targetPath').value;
  const interval = document.getElementById('interval').value;
  const time = document.getElementById('time').value;

  // Build cron rule
  let rule;
  if (interval === "daily") rule = `0 ${time.split(':')[1]} ${time.split(':')[0]} * * *`;
  else if (interval === "monthly") rule = `0 ${time.split(':')[1]} ${time.split(':')[0]} 1 * *`;
  else if (interval === "yearly") rule = `0 ${time.split(':')[1]} ${time.split(':')[0]} 1 1 *`;

  const backupLocal = document.getElementById('backupLocal').checked;
  const backupGdrive = document.getElementById('backupGdrive').checked;

  if (backupLocal) {
    await window.electronAPI.setSchedule(rule, source, target);
    appendLog(`🗓️ Jadwal backup lokal diset: ${interval} @ ${time}`);
  }
  if (backupGdrive) {
    await window.electronAPI.setGdriveSchedule(rule, source, null); // null = folder BackupApp otomatis
    appendLog(`🗓️ Jadwal backup ke Google Drive diset: ${interval} @ ${time}`);
  }
};

window.electronAPI.onLogUpdate(msg => appendLog(msg));

function appendLog(msg) {
  const log = document.getElementById('log');
  const p = document.createElement('p');
  p.textContent = `[${new Date().toLocaleString()}] ${msg}`;
  log.prepend(p);
}

document.getElementById('openSheet').onclick = () => {
  const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1Zd9w4mCHS-CrxlmeZahW2GXgFhuLRS-GuG_efYmLmqM/edit';
  window.open(spreadsheetUrl, '_blank');
};

document.getElementById('gdriveBackup').addEventListener('click', async () => {
  const source = document.getElementById('sourcePath').value;
  const target = document.getElementById('targetPath').value;

  if (!source) {
    logMessage("❌ Folder sumber belum dipilih.");
    return;
  }

  try {
    const result = await window.electronAPI.backupToGdrive(source, target || null);
    logMessage(result);
  } catch (err) {
    logMessage(`❌ Gagal backup ke Google Drive: ${err.message}`);
  }
});

function logMessage(msg) {
  const logElement = document.getElementById('log');
  const p = document.createElement('p');
  p.textContent = `${new Date().toLocaleTimeString()} - ${msg}`;
  logElement.appendChild(p);
  logElement.scrollTop = logElement.scrollHeight;
}

