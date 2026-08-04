// VELO v3.1 - Robust main process
const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// === Logger ===
function log(...args) {
  const msg = args.join(' ');
  try { fs.appendFileSync(path.join(__dirname, 'velo.log'), `[${new Date().toISOString()}] ${msg}\n`); } catch (_) {}
  console.log(msg);
}
log('=== VELO starting ===');

// === Paths (root-level main.js, so everything is nearby) ===
const ROOT = __dirname;
const RENDERER_HTML = path.join(ROOT, 'renderer', 'index.html');
const PRELOAD_JS = path.join(ROOT, 'preload.js');
const DATA_DIR = path.join(ROOT, 'velo-data');
log('Root:', ROOT);
log('Renderer:', RENDERER_HTML, '| exists:', fs.existsSync(RENDERER_HTML));
log('Preload:', PRELOAD_JS, '| exists:', fs.existsSync(PRELOAD_JS));

// === Storage ===
function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { log('mkdirSync error:', e.message); }
}
function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); }
  catch (_) { return fallback; }
}
function writeJSON(name, obj) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(obj, null, 2), 'utf8');
}

// === Config ===
const DEFAULTS = { groqKey:'', language:'hinglish', model:'llama-3.3-70b-versatile', theme:'dark', wakeWord:'hey velo' };
function getConfig() { return { ...DEFAULTS, ...(readJSON('config.json', {})) }; }
function setConfig(patch) { const c = { ...getConfig(), ...patch }; writeJSON('config.json', c); return c; }

// === AI (Groq) ===
async function groqChat(messages, model) {
  const key = getConfig().groqKey;
  if (!key) return { ok: false, response: 'No Groq key set. Go to console.groq.com to get a free key.', local: true };
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || getConfig().model, messages, max_tokens: 1024, temperature: 0.7 })
    });
    if (!res.ok) {
      let err = `Groq error ${res.status}`;
      try { const j = await res.json(); err += ': ' + (j.error?.message || ''); } catch (_) {}
      return { ok: false, response: err };
    }
    const data = await res.json();
    return { ok: true, response: data.choices?.[0]?.message?.content || '(no response)', local: false };
  } catch (e) {
    return { ok: false, response: 'Network error: ' + e.message };
  }
}

// === Local fallback ===
function localReply(txt) {
  const t = txt.toLowerCase();
  if (/hello|hi\b|hey|namaste|hii/.test(t)) return 'Hello Jaydev! How can I help you today?';
  if (/how are you|kaise ho/.test(t)) return 'I am doing great, thanks for asking!';
  if (/your name|tumhara naam/.test(t)) return 'I am VELO, your free personal AI desktop assistant.';
  if (/who made you|who created you/.test(t)) return 'Jaydev built me! A completely free, local-first AI assistant.';
  if (/thanks|thank you|shukriya|dhanyavad/.test(t)) return 'You are most welcome! Anytime.';
  if (/bye|goodbye|alvida/.test(t)) return 'Goodbye! See you soon.';
  if (/what can you do|kya kar sakte/.test(t))
    return 'I can: Chat with AI (need free Groq key), manage notes & tasks, remember things, control your PC (open apps, shutdown, restart, volume), open websites, run terminal commands. Just ask!';
  return 'I am in offline local mode. Add a FREE Groq API key in Settings to unlock full AI. Try: "open notepad", "show notes", "shutdown PC", "what can you do".';
}

// === Memory ===
function getMemory() { return readJSON('memory.json', []); }
function addMemory(item) {
  const m = getMemory();
  m.push({ text: String(item).substring(0, 300), time: Date.now() });
  if (m.length > 200) m.splice(0, m.length - 200);
  writeJSON('memory.json', m);
  return m;
}

// === Notes & Tasks ===
function getNotes() { return readJSON('notes.json', []); }
function saveNotes(n) { writeJSON('notes.json', n); return n; }
function getTasks() { return readJSON('tasks.json', []); }
function saveTasks(t) { writeJSON('tasks.json', t); return t; }

// === PC Control ===
function openApp(name) {
  const map = { notepad:'notepad', chrome:'chrome', vscode:'code', code:'code',
    calculator:'calc', paint:'mspaint', explorer:'explorer', cmd:'cmd', terminal:'cmd',
    'task manager':'taskmgr', 'control panel':'control', settings:'ms-settings:',
    whatsapp:'whatsapp:', spotify:'spotify:', edge:'msedge' };
  const cmd = map[name.toLowerCase()] || name;
  exec(`start "" ${cmd}`, { windowsHide: true }, () => {});
  return `Opening ${name}...`;
}

function runCommand(cmd) {
  return new Promise(resolve => {
    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve(stdout || stderr || (err ? 'Error: ' + err.message : 'Done.'));
    });
  });
}

function systemAction(action) {
  const cmds = {
    shutdown: 'shutdown /s /t 3',
    restart: 'shutdown /r /t 3',
    sleep: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0',
    lock: 'rundll32.exe user32.dll,LockWorkStation',
    screenshot: 'start ms-screenclip:'
  };
  if (cmds[action]) { exec(cmds[action], { windowsHide: true }); return 'Done'; }
  return 'Unknown action: ' + action;
}

// === Register ALL IPC handlers ===
function registerIPC() {
  log('Registering IPC handlers...');
  try {
    ipcMain.handle('ai:chat', async (_e, msg, history) => {
      const cfg = getConfig();
      const langHint = cfg.language === 'hinglish' ? 'Reply in Hinglish (Hindi+English mix), friendly tone.'
        : cfg.language === 'hindi' ? 'Reply in Hindi language.' : 'Reply in English.';
      const mems = getMemory().slice(-5).map(m => m.text).join('; ');
      try {
        if (!cfg.groqKey) return { ok: true, response: localReply(msg), local: true };
        const messages = [
          { role: 'system', content: `You are VELO, a helpful personal AI desktop assistant. ${langHint} Keep answers clear and concise.${mems ? ' Remembered context: ' + mems : ''}` },
          ...(history || []).slice(-12),
          { role: 'user', content: msg }
        ];
        return await groqChat(messages, cfg.model);
      } catch (e) { return { ok: false, response: 'AI error: ' + e.message, local: false }; }
    });
    ipcMain.handle('ai:setkey', (_e, key) => { setConfig({ groqKey: String(key).trim() }); return { ok: true }; });
    ipcMain.handle('mem:get', () => getMemory());
    ipcMain.handle('mem:add', (_e, t) => addMemory(t));
    ipcMain.handle('mem:clear', () => { writeJSON('memory.json', []); return { ok: true }; });
    ipcMain.handle('notes:get', () => getNotes());
    ipcMain.handle('notes:save', (_e, n) => { saveNotes(n); return { ok: true }; });
    ipcMain.handle('tasks:get', () => getTasks());
    ipcMain.handle('tasks:save', (_e, t) => { saveTasks(t); return { ok: true }; });
    ipcMain.handle('config:get', () => getConfig());
    ipcMain.handle('config:set', (_e, p) => setConfig(p));
    ipcMain.handle('pc:open', (_e, n) => openApp(n));
    ipcMain.handle('pc:run', (_e, c) => runCommand(c));
    ipcMain.handle('pc:action', (_e, a) => systemAction(a));
    ipcMain.handle('pc:systeminfo', () => {
      try {
        return {
          platform: os.platform(), arch: os.arch(), cpus: os.cpus().length,
          ram: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
          hostname: os.hostname(), version: app.getVersion()
        };
      } catch (e) { return { error: e.message }; }
    });
    ipcMain.handle('browser:open', (_e, url) => {
      let u = String(url);
      if (!/^https?:\/\//i.test(u)) u = 'https://www.google.com/search?q=' + encodeURIComponent(u);
      shell.openExternal(u).catch(() => {});
      return { ok: true };
    });
    ipcMain.handle('clipboard:write', (_e, t) => { clipboard.writeText(String(t)); return { ok: true }; });
    ipcMain.handle('clipboard:read', () => clipboard.readText());
    log('All IPC handlers registered OK');
  } catch (e) {
    log('IPC registration ERROR:', e.message, e.stack);
    throw e;
  }
}

// === Window ===
let win = null;
function createWindow() {
  log('Creating window...');
  try {
    win = new BrowserWindow({
      width: 1280, height: 820, minWidth: 900, minHeight: 600,
      title: 'VELO - Personal AI Assistant',
      backgroundColor: '#0b0f1a',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: PRELOAD_JS,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    // Show when ready (prevents white flash)
    win.once('ready-to-show', () => {
      log('Window ready to show');
      win.show();
    });

    // Handle crashes
    win.webContents.on('did-fail-load', (ev, code, desc) => {
      log('Page load failed:', code, desc);
    });
    win.webContents.on('crashed', () => { log('Renderer crashed!'); });
    win.on('unresponsive', () => { log('Window unresponsive!'); });

    win.loadFile(RENDERER_HTML).catch(err => {
      log('loadFile ERROR:', err.message);
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    });

    win.on('closed', () => { win = null; log('Window closed'); });
    log('Window created OK');
  } catch (e) {
    log('createWindow ERROR:', e.message, e.stack);
    throw e;
  }
}

// === App lifecycle ===
app.whenReady().then(() => {
  log('App ready');
  ensureDir();
  registerIPC();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(err => {
  log('FATAL: app.whenReady failed:', err.message, err.stack);
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') app.quit();
});

// Catch-all for unhandled errors
process.on('uncaughtException', (err) => {
  log('UNCAUGHT EXCEPTION:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  log('UNHANDLED REJECTION:', reason);
});

log('=== main.js loaded, waiting for app ready ===');
