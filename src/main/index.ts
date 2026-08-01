import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { setupAIHandlers } from './ai';
import { setupMemoryHandlers } from './memory';
import { setupSkillHandlers } from './ipc';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000, height: 700, minWidth: 800, minHeight: 600,
    title: 'VELO - Personal AI Assistant', backgroundColor: '#0f172a',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();
  setupAIHandlers();
  setupMemoryHandlers();
  setupSkillHandlers();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
