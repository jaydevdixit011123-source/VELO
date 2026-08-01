import { ipcMain, dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { mainWindow } from './index';

const run = (cmd: string): Promise<string> => new Promise((resolve) => {
  exec(cmd, { windowsHide: true }, (err, stdout, stderr) => resolve(stdout || stderr || (err ? err.message : '')));
});

function dataDir() {
  const d = path.join(app.getPath('userData'), 'velo', 'data');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
function store(name: string) {
  const file = path.join(dataDir(), name + '.json');
  return {
    read: (): any[] => { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; } catch { return []; } },
    write: (d: any[]) => { fs.writeFileSync(file, JSON.stringify(d, null, 2), 'utf8'); }
  };
}

export function setupSkillHandlers() {
  // ===== FILE MANAGER =====
  ipcMain.handle('file:list', (_e, dirPath?: string) => {
    const dir = dirPath || os.homedir();
    try {
      return fs.readdirSync(dir, { withFileTypes: true }).map(e => ({ name: e.name, isDir: e.isDirectory(), path: path.join(dir, e.name) }));
    } catch (e: any) { return { error: e.message }; }
  });
  ipcMain.handle('file:search', (_e, q: string, dirPath?: string) => {
    const dir = dirPath || os.homedir();
    const results: any[] = [];
    const walk = (d: string, depth: number) => {
      if (depth > 3 || results.length > 50) return;
      try {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          if (results.length > 50) break;
          const full = path.join(d, e.name);
          if (e.name.toLowerCase().includes(q.toLowerCase())) results.push({ name: e.name, path: full, isDir: e.isDirectory() });
          if (e.isDirectory()) walk(full, depth + 1);
        }
      } catch {}
    };
    walk(dir, 0);
    return results;
  });
  ipcMain.handle('file:rename', (_e, oldPath: string, newName: string) => {
    try { const np = path.join(path.dirname(oldPath), newName); fs.renameSync(oldPath, np); return { ok: true, newPath: np }; }
    catch (e: any) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('file:delete', async (_e, filePath: string) => {
    const res = await dialog.showMessageBox({ type: 'warning', title: 'Confirm Delete', message: 'Delete this?', detail: filePath, buttons: ['Delete', 'Cancel'], defaultId: 1 });
    if (res.response !== 0) return { ok: false, cancelled: true };
    try { fs.rmSync(filePath, { recursive: true, force: true }); return { ok: true }; }
    catch (e: any) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('file:choosedir', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('file:open', (_e, p: string) => { run('start "" "' + p + '"'); return { ok: true }; });

  // ===== PC CONTROL =====
  ipcMain.handle('pc:openapp', (_e, appName: string) => {
    const a = String(appName).trim();
    if (!a) return { ok: false, error: 'App name khali hai' };
    run('start "" ' + a);
    return { ok: true };
  });
  ipcMain.handle('pc:volume', (_e, dir: string) => {
    const ch = dir === 'up' ? 175 : dir === 'down' ? 174 : 173;
    run('powershell -command "(New-Object -ComObject WScript.Shell).SendKeys([char]' + ch + ')"');
    return { ok: true };
  });
  ipcMain.handle('pc:shutdown', (_e, seconds: number) => { run('shutdown /s /t ' + (seconds || 30)); return { ok: true }; });
  ipcMain.handle('pc:cancelshutdown', () => { run('shutdown /a'); return { ok: true }; });
  ipcMain.handle('pc:screenshot', async () => {
    try {
      const win = mainWindow;
      if (!win) return { ok: false, error: 'Window nahi mili' };
      const img = await win.webContents.capturePage();
      const dir = path.join(os.homedir(), 'Pictures', 'VELO');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'velo-' + Date.now() + '.png');
      fs.writeFileSync(file, img.toPNG());
      return { ok: true, path: file };
    } catch (e: any) { return { ok: false, error: e.message }; }
  });

  // ===== GIT =====
  ipcMain.handle('git:exec', (_e, dir: string, args: string[]) => {
    const cmd = (args || []).join(' ');
    if (!dir || !fs.existsSync(dir)) return Promise.resolve({ ok: false, error: 'Folder sahi nahi hai' });
    return run('git -C "' + dir + '" ' + cmd).then(out => ({ ok: true, output: out }));
  });

  // ===== BROWSER =====
  ipcMain.handle('browser:open', (_e, url: string) => {
    const { shell } = require('electron');
    shell.openExternal(/^https?:/i.test(url) ? url : 'https://' + url);
    return { ok: true };
  });
  ipcMain.handle('browser:search', (_e, q: string) => {
    const { shell } = require('electron');
    shell.openExternal('https://www.google.com/search?q=' + encodeURIComponent(q));
    return { ok: true };
  });

  // ===== NOTES =====
  const notes = store('notes');
  ipcMain.handle('notes:list', () => notes.read());
  ipcMain.handle('notes:add', (_e, title: string, body: string) => {
    const n = notes.read();
    const item = { id: Date.now(), title: title || 'Note', body: body || '', createdAt: new Date().toISOString() };
    n.unshift(item); notes.write(n); return item;
  });
  ipcMain.handle('notes:delete', (_e, id: number) => { notes.write(notes.read().filter(n => n.id !== id)); return { ok: true }; });

  // ===== REMINDERS =====
  const reminders = store('reminders');
  ipcMain.handle('reminders:list', () => reminders.read());
  ipcMain.handle('reminders:add', (_e, title: string, when: string) => {
    const r = reminders.read();
    const item = { id: Date.now(), title, when, done: false };
    r.push(item); reminders.write(r); return item;
  });
  ipcMain.handle('reminders:toggle', (_e, id: number) => {
    reminders.write(reminders.read().map(r => r.id === id ? { ...r, done: !r.done } : r));
    return { ok: true };
  });
  ipcMain.handle('reminders:delete', (_e, id: number) => { reminders.write(reminders.read().filter(r => r.id !== id)); return { ok: true }; });

  // ===== CALENDAR =====
  const cal = store('calendar');
  ipcMain.handle('calendar:list', () => cal.read());
  ipcMain.handle('calendar:add', (_e, title: string, date: string) => {
    const c = cal.read();
    const item = { id: Date.now(), title, date };
    c.push(item); cal.write(c); return item;
  });
  ipcMain.handle('calendar:delete', (_e, id: number) => { cal.write(cal.read().filter(c => c.id !== id)); return { ok: true }; });

  // ===== MEMORY =====
  const mem = store('memory');
  ipcMain.handle('memory:list', () => mem.read());
  ipcMain.handle('memory:add', (_e, key: string, value: string) => {
    const m = mem.read();
    const item = { id: Date.now(), key, value, createdAt: new Date().toISOString() };
    m.unshift(item); mem.write(m); return item;
  });
  ipcMain.handle('memory:delete', (_e, id: number) => { mem.write(mem.read().filter(m => m.id !== id)); return { ok: true }; });
}