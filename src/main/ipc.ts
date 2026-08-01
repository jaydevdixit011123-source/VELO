import { ipcMain, dialog, desktopCapturer, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

const run = (cmd: string): Promise<string> => new Promise((resolve) => {
  exec(cmd, (err, stdout, stderr) => resolve(stdout || stderr || (err ? err.message : '')));
});

export function setupSkillHandlers() {
  // File Manager
  ipcMain.handle('file:list', async (_e, dirPath?: string) => {
    const dir = dirPath || os.homedir();
    try { return fs.readdirSync(dir, { withFileTypes: true }).map(e => ({ name: e.name, isDir: e.isDirectory(), path: path.join(dir, e.name) })); }
    catch (e: any) { return { error: e.message }; }
  });
  ipcMain.handle('file:search', async (_e, query: string, dirPath?: string) => {
    const dir = dirPath || os.homedir(); const results: any[] = [];
    const walk = (d: string, depth: number) => {
      if (depth > 3 || results.length > 100) return;
      try { const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const e of entries) { if (results.length > 100) break; const full = path.join(d, e.name);
          if (e.name.toLowerCase().includes(query.toLowerCase())) results.push({ name: e.name, path: full, isDir: e.isDirectory() });
          if (e.isDirectory()) walk(full, depth + 1); } } catch (e) {}
    };
    walk(dir, 0); return results;
  });
  ipcMain.handle('file:rename', async (_e, oldPath: string, newName: string) => {
    try { const newPath = path.join(path.dirname(oldPath), newName); fs.renameSync(oldPath, newPath); return { ok: true, newPath }; }
    catch (e: any) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('file:delete', async (_e, filePath: string) => {
    const res = await dialog.showMessageBox({ type: 'warning', title: 'Confirm Delete', message: 'Delete this?', detail: filePath, buttons: ['Delete', 'Cancel'] });
    if (res.response !== 0) return { ok: false, cancelled: true };
    try { if (fs.lstatSync(filePath).isDirectory()) fs.rmSync(filePath, { recursive: true }); else fs.unlinkSync(filePath); return { ok: true }; }
    catch (e: any) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('file:choosedir', async () => { const res = await dialog.showOpenDialog({ properties: ['openDirectory'] }); return res.filePaths[0] || ''; });

  // PC Control
  ipcMain.handle('pc:openapp', async (_e, appName: string) => {
    if (process.platform === 'win32') await run('start ' + appName);
    else if (process.platform === 'darwin') await run('open -a ' + appName);
    else await run(appName + ' &');
    return { ok: true };
  });
  ipcMain.handle('pc:screenshot', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    if (sources.length > 0) { const file = path.join(os.homedir(), 'VELO_screenshot.png'); fs.writeFileSync(file, sources[0].thumbnail.toPNG()); return { ok: true, file }; }
    return { ok: false, error: 'No screen found' };
  });
  ipcMain.handle('pc:shutdown', async () => {
    const res = await dialog.showMessageBox({ type: 'warning', title: 'Shutdown PC?', message: 'VELO will shut down your computer.', buttons: ['Shut Down', 'Cancel'] });
    if (res.response === 0 && process.platform === 'win32') await run('shutdown /s /t 10');
    return { ok: true };
  });

  // Notes
  const notesDir = () => { const d = path.join(app.getPath('userData'), 'velo', 'notes'); fs.mkdirSync(d, { recursive: true }); return d; };
  ipcMain.handle('notes:save', async (_e, title: string, content: string) => {
    const file = path.join(notesDir(), (title || 'Untitled').replace(/[^\w ]/g, '_') + '.md');
    fs.writeFileSync(file, content, 'utf8'); return { ok: true, file };
  });
  ipcMain.handle('notes:list', async () => { try { return fs.readdirSync(notesDir()).filter(f => f.endsWith('.md')); } catch (e) { return []; } });

  // GitHub
  ipcMain.handle('git:exec', async (_e, dir: string, args: string[]) => {
    const out = await run(`git -C "${dir}" ${args.join(' ')}`); return { ok: true, output: out };
  });

  // Generic shell
  ipcMain.handle('shell:exec', async (_e, cmd: string) => await run(cmd));
}
