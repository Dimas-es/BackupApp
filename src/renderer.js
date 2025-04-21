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

document.getElementById('autoBackup').onclick = () => {
  const source = document.getElementById('sourcePath').value;
  const target = document.getElementById('targetPath').value;
  const interval = document.getElementById('interval').value;
  const time = document.getElementById('time').value;

  let rule;
  if (interval === "daily") rule = `0 ${time.split(':')[1]} ${time.split(':')[0]} * * *`;
  else if (interval === "monthly") rule = `0 ${time.split(':')[1]} ${time.split(':')[0]} 1 * *`;
  else if (interval === "yearly") rule = `0 ${time.split(':')[1]} ${time.split(':')[0]} 1 1 *`;

  window.electronAPI.setSchedule(rule, source, target);
  appendLog(`🗓️ Jadwal backup diset: ${interval} @ ${time}`);
};

window.electronAPI.onLogUpdate(msg => appendLog(msg));

function appendLog(msg) {
  const log = document.getElementById('log');
  const p = document.createElement('p');
  p.textContent = `[${new Date().toLocaleString()}] ${msg}`;
  log.prepend(p);
}
