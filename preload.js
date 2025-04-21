const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  backupNow: (src, tgt) => ipcRenderer.invoke('backup-now', src, tgt),
  setSchedule: (rule, src, tgt) => ipcRenderer.invoke('set-schedule', rule, src, tgt),
  onLogUpdate: (callback) => ipcRenderer.on('log-update', (_, msg) => callback(msg)),
});
