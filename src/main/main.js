// VELO v3.0 - Main Process (pure JS, no native modules)
const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

let mainWindow = null;

// ---------------- Storage helpers ----------------
const DATA_DIR = path.join(app.getPath('userData'), 'velo-data');
function ensureDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }
function storeFile(name) { return path.join(DATA_DIR, name); }
function readStore(name, fallback = null) {
  try { return JSON.parse(fs.readFileSync(storeFile(name), 'utf8')); }
  catch (e) { return fallback; }
}
function writeStore(name, obj) {
  ensureDir();
  fs.writeFileSync(storeFile(name), JSON.stringify(obj, null, 2), 'utf8');
}
const defaults = {
  groqKey: '', language: 'hinglish', model: 'llama-3.3-70b-versatile',
  theme: 'dark', wakeWord: 'hey velo', voiceEnabled: true, voiceName: ''
};
function getConfig() { return Object.assign({}, defaults, readStore('config.json', {})); }
function setConfig(patch) { const c = getConfig(); Object.assign(c, patch); writeStore('config.json', c); return c; }

// ---------------- GROQ AI ----------------
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
async function groqChat(messages, model) {
  const key = getConfig().groqKey;
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || getConfig().model, messages, max_tokens: 1024, temperature: 0.7 })
  });
  if (!res.ok) {
    let e = 'Groq error ' + res.status;
    try { const j = await res.json(); e += ': ' + (j.error?.message || j.error || ''); } catch (_) {}
    throw new Error(e);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '(no response)';
}

// Local fallback when no Groq key (works 100% offline and free)
function localReply(text) {
  const t = text.toLowerCase();
  if (t.includes('hello') || t.includes('hi') || t.includes('namaste') || t.includes('hii'))
    return 'Hello Jaydev! How can I help you today?';
  if (t.includes('how are you')) return 'I am doing great, thanks for asking!';
  if (t.includes('your name')) return 'I am VELO, your personal AI assistant, built to be fast, free and all yours.';
  if (t.includes('who made you') || t.includes('who created you')) return 'Jaydev built me to be a completely free, local-first AI assistant.';
  if (t.includes('thanks') || t.includes('thank you') || t.includes('shukriya')) return 'You are most welcome! Anytime.';
  if (t.includes('bye')) return 'Goodbye! See you soon.';
  return 'I am running in offline local mode, so I am replying with built-in responses. Add a FREE Groq API key in Settings to unlock full AI chat. For now try: open notepad, show my notes, create reminder, screenshot, or what can you do.';
}

// ---------------- Memory ----------------
function getMemory() { return readStore('memory.json', []); }
function addMemory(item) { const m = getMemory(); m.push({ text: item, ts: Date.now() }); if (m.length > 200) m.splice(0, m.length - 200); writeStore('memory.json', m); return m; }
function clearMemory() { writeStore('memory.json', []); }

// ---------------- Notes / Tasks ----------------
function getNotes() { return readStore('notes.json', []); }
function saveNotes(n) { writeStore('notes.json', n); }
function getTasks() { return readStore('tasks.json', []); }
function saveTasks(t) { writeStore('tasks.json', t); }

// ---------------- PC control ----------------
function openApp(name) {
  const n = name.toLowerCase();
  const map = { 'notepad': 'notepad', 'chrome': 'chrome', 'vscode': 'code', 'code': 'code', 'calculator': 'calc', 'paint': 'mspaint', 'explorer': 'explorer', 'cmd': 'cmd', 'terminal': 'cmd', 'task manager': 'taskmgr', 'control panel': 'control' };
  const target = map[n] || n;
  exec('start "" ' + target, { windowsHide: true }, () => {});
  return 'Opening ' + name + '...';
}
function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true, timeout: 15000 }, (e, stdout, stderr) => {
      resolve(stdout || stderr || (e ? 'Command error: ' + e.message : 'Done'));
    });
  });
}
function systemAction(action) {
  const cmds = {
    shutdown: 'shutdown /s /t 3', restart: 'shutdown /r /t 3',
    sleep: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0',
    lock: 'rundll32.exe user32.dll,LockWorkStation',
    volup: '(new-object -com wscript.shell).SendKeys([char]175)',
    voldown: '(new-object -com wscript.shell).SendKeys([char]174)'
  };
  if (cmds[action]) { exec('powershell -command "' + cmds[action] + '"', { windowsHide: true }); return 'Done'; }
  return 'Unknown action';
}

// ---------------- IPC setup ----------------
function setupIPC() {
  ipcMain.handle('ai:chat', async (_e, msg, history = []) => {
    const cfg = getConfig();
    const langHint = cfg.language === 'hinglish' ? 'Reply in Hinglish (Hindi + English mix), friendly and helpful.' : cfg.language === 'hindi' ? 'Reply in Hindi.' : 'Reply in English.';
    const mems = getMemory().slice(-5).map(m => m.text).join('; ');
    try {
      if (!cfg.groqKey) return { ok: true, response: localReply(msg), local: true };
      const messages = [
        { role: 'system', content: 'You are VELO, a helpful personal AI desktop assistant. ' + langHint + ' Keep answers clear and concise.' + (mems ? ' Remembered context: ' + mems : '') },
        ...(history || []).slice(-12),
        { role: 'user', content: msg }
      ];
      const response = await groqChat(messages, cfg.model);
      return { ok: true, response, local: false };
    } catch (e) { return { ok: false, response: e.message }; }
  });
  ipcMain.handle('ai:setkey', (_e, key) => { setConfig({ groqKey: String(key).trim() }); return { ok: true }; });
  ipcMain.handle('mem:get', () => getMemory());
  ipcMain.handle('mem:add', (_e, t) => addMemory(t));
  ipcMain.handle('mem:clear', () => { clearMemory(); return { ok: true }; });
  ipcMain.handle('notes:get', () => getNotes());
  ipcMain.handle('notes:save', (_e, notes) => { saveNotes(notes); return { ok: true }; });
  ipcMain.handle('tasks:get', () => getTasks());
  ipcMain.handle('tasks:save', (_e, t) => { saveTasks(t); return { ok: true }; });
  ipcMain.handle('config:get', () => getConfig());
  ipcMain.handle('config:set', (_e, patch) => { setConfig(patch); return getConfig(); });
  ipcMain.handle('pc:open', (_e, name) => openApp(name));
  ipcMain.handle('pc:run', (_e, cmd) => runCommand(cmd));
  ipcMain.handle('pc:action', (_e, a) => systemAction(a));
  ipcMain.handle('pc:systeminfo', () => ({
    platform: os.platform(), arch: os.arch(), cpus: os.cpus().length,
    mem: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
    hostname: os.hostname(), osType: os.type(), version: app.getVersion()
  }));
  ipcMain.handle('browser:open', (_e, url) => {
    let u = url; if (!/^https?:\/\//i.test(u)) u = 'https://www.google.com/search?q=' + encodeURIComponent(url);
    shell.openExternal(u); return { ok: true };
  });
  ipcMain.handle('clipboard:write', (_e, t) => { clipboard.writeText(String(t)); return { ok: true }; });
  ipcMain.handle('clipboard:read', () => clipboard.readText());
}

// ---------------- Window ----------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 1000, minHeight: 660,
    backgroundColor: '#0b0f1a', title: 'VELO - Personal AI Assistant', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  mainWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  ensureDir();
  setupIPC();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
