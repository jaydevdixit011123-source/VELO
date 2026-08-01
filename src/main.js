// VELO v2.2 - Pure JavaScript, NO native modules, NO TypeScript
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const https = require('https');

let mainWindow = null;
const STORE_FILE = path.join(app.getPath('userData'), 'velo-config.json');

// ===== CONFIG STORE =====
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); }
  catch { return { groqKey: '', memory: [], notes: [], reminders: [], calendar: [] }; }
}
function saveConfig(c) { fs.writeFileSync(STORE_FILE, JSON.stringify(c, null, 2)); }

// ===== GROQ API (pure https, no groq-sdk needed) =====
function groqChat(messages, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7
    });
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve(j.choices?.[0]?.message?.content || 'No response from AI');
        } catch (e) {
          resolve('Error parsing AI response');
        }
      });
    });
    req.on('error', (e) => resolve('API Error: ' + e.message));
    req.on('timeout', () => { req.destroy(); resolve('API timeout - check internet'); });
    req.write(data);
    req.end();
  });
}

// ===== WINDOW =====
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 780,
    minWidth: 940, minHeight: 600,
    backgroundColor: '#0f172a',
    title: 'VELO - Personal AI Assistant',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { app.quit(); });

// ===== IPC HANDLERS =====

// AI Chat
ipcMain.handle('ai:chat', async (e, msg, history) => {
  const config = loadConfig();
  if (!config.groqKey) return { ok: false, response: 'No API key set. Go to Settings!', needsKey: true };
  const msgs = [...(history || []).slice(-15), { role: 'user', content: msg }];
  try {
    const reply = await groqChat(msgs, config.groqKey);
    return { ok: true, response: reply };
  } catch (err) {
    return { ok: false, response: 'Error: ' + err.message };
  }
});

// Settings
ipcMain.handle('settings:save', (e, key) => {
  const config = loadConfig();
  config.groqKey = key.trim();
  saveConfig(config);
  return { ok: true };
});
ipcMain.handle('settings:get', () => {
  const config = loadConfig();
  return { hasKey: !!config.groqKey, key: config.groqKey ? '••••' + config.groqKey.slice(-4) : '' };
});

// Memory
ipcMain.handle('memory:get', () => { const c = loadConfig(); return c.memory || []; });
ipcMain.handle('memory:add', (e, k, v) => {
  const c = loadConfig();
  c.memory = c.memory || [];
  c.memory.push({ id: Date.now(), key: k, value: v, approved: false });
  saveConfig(c);
  return { ok: true };
});
ipcMain.handle('memory:approve', (e, id) => {
  const c = loadConfig();
  const m = (c.memory || []).find(x => x.id === id);
  if (m) m.approved = true;
  saveConfig(c);
  return { ok: true };
});
ipcMain.handle('memory:delete', (e, id) => {
  const c = loadConfig();
  c.memory = (c.memory || []).filter(x => x.id !== id);
  saveConfig(c);
  return { ok: true };
});

// File Manager
ipcMain.handle('file:list', (e, dirPath) => {
  const dir = dirPath || os.homedir();
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).map(ent => ({
      name: ent.name,
      isDir: ent.isDirectory(),
      path: path.join(dir, ent.name)
    }));
  } catch (e) { return { error: e.message }; }
});
ipcMain.handle('file:search', (e, query, dirPath) => {
  const dir = dirPath || os.homedir();
  const results = [];
  function walk(d, depth) {
    if (depth > 3 || results.length > 100) return;
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const ent of entries) {
        if (results.length > 100) break;
        const full = path.join(d, ent.name);
        if (ent.name.toLowerCase().includes(query.toLowerCase()))
          results.push({ name: ent.name, path: full, isDir: ent.isDirectory() });
        if (ent.isDirectory()) walk(full, depth + 1);
      }
    } catch {}
  }
  walk(dir, 0);
  return results;
});
ipcMain.handle('file:open', (e, filePath) => { shell.openPath(filePath); return { ok: true }; });
ipcMain.handle('file:delete', async (e, filePath) => {
  const res = await dialog.showMessageBox({
    type: 'warning', title: 'Delete?', message: 'Delete this file?', detail: filePath,
    buttons: ['Delete', 'Cancel']
  });
  if (res.response === 0) { try { fs.unlinkSync(filePath); return { ok: true }; } catch(e) { return { error: e.message }; } }
  return { cancelled: true };
});
ipcMain.handle('file:choosedir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return res.canceled ? null : res.filePaths[0];
});

// PC Control
ipcMain.handle('pc:openapp', (e, appName) => {
  return new Promise(resolve => {
    exec('start "" "' + appName + '"', { shell: 'powershell.exe' }, (err) => {
      if (err) {
        exec('start ' + appName, (err2) => resolve(err2 ? 'Could not open' : 'Opened'));
      } else resolve('Opened');
    });
  });
});
ipcMain.handle('pc:shutdown', () => { exec('shutdown /s /t 60'); return 'Shutting down in 60s'; });
ipcMain.handle('pc:volume', (e, lvl) => {
  exec('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]' +
    (lvl === 'up' ? '175' : '174') + ')"');
  return 'Volume ' + lvl;
});

// Browser
ipcMain.handle('browser:open', (e, url) => { shell.openExternal(url.startsWith('http') ? url : 'https://' + url); return 'Opening...'; });
ipcMain.handle('browser:search', (e, q) => { shell.openExternal('https://www.google.com/search?q=' + encodeURIComponent(q)); return 'Searching...'; });

// Notes
ipcMain.handle('notes:get', () => { const c = loadConfig(); return c.notes || []; });
ipcMain.handle('notes:add', (e, text) => {
  const c = loadConfig();
  c.notes = c.notes || [];
  c.notes.push({ id: Date.now(), text, time: new Date().toISOString() });
  saveConfig(c);
  return { ok: true };
});
ipcMain.handle('notes:delete', (e, id) => {
  const c = loadConfig();
  c.notes = (c.notes || []).filter(n => n.id !== id);
  saveConfig(c);
  return { ok: true };
});

// Reminders
ipcMain.handle('reminders:get', () => { const c = loadConfig(); return c.reminders || []; });
ipcMain.handle('reminders:add', (e, title, time) => {
  const c = loadConfig();
  c.reminders = c.reminders || [];
  c.reminders.push({ id: Date.now(), title, time, done: false });
  saveConfig(c);
  return { ok: true };
});
ipcMain.handle('reminders:toggle', (e, id) => {
  const c = loadConfig();
  const r = (c.reminders || []).find(x => x.id === id);
  if (r) r.done = !r.done;
  saveConfig(c);
  return { ok: true };
});
ipcMain.handle('reminders:delete', (e, id) => {
  const c = loadConfig();
  c.reminders = (c.reminders || []).filter(r => r.id !== id);
  saveConfig(c);
  return { ok: true };
});

// Calendar
ipcMain.handle('calendar:get', (e, month) => {
  const c = loadConfig();
  const events = c.calendar || [];
  if (month) return events.filter(ev => ev.date && ev.date.startsWith(month));
  return events;
});
ipcMain.handle('calendar:add', (e, title, date, desc) => {
  const c = loadConfig();
  c.calendar = c.calendar || [];
  c.calendar.push({ id: Date.now(), title, date, desc: desc || '', time: new Date().toISOString() });
  saveConfig(c);
  return { ok: true };
});
ipcMain.handle('calendar:delete', (e, id) => {
  const c = loadConfig();
  c.calendar = (c.calendar || []).filter(ev => ev.id !== id);
  saveConfig(c);
  return { ok: true };
});

// GitHub
ipcMain.handle('git:exec', (e, dir, args) => {
  return new Promise(resolve => {
    exec('git ' + args.join(' '), { cwd: dir || os.homedir() }, (err, stdout, stderr) => {
      resolve(stdout || stderr || (err ? err.message : ''));
    });
  });
});

console.log('VELO v2.2 started - Pure JS, AI ready!');
