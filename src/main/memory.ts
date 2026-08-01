import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

function dbFile(): string {
  const d = path.join(app.getPath('userData'), 'velo');
  fs.mkdirSync(d, { recursive: true });
  return path.join(d, 'memory.json');
}
function read(): any[] { try { if(!fs.existsSync(dbFile())) return []; return JSON.parse(fs.readFileSync(dbFile(),'utf8')); } catch(e){ return []; } }
function write(x:any[]) { fs.writeFileSync(dbFile(), JSON.stringify(x,null,2), 'utf8'); }

export function setupMemoryHandlers() {
  ipcMain.handle('memory:get', async () => read().filter(m=>m.approved));
  ipcMain.handle('memory:add', async (_e,k:string,v:string) => { const i=read(); const it={id:Date.now(),key:k,value:v,approved:false,createdAt:new Date().toISOString()}; i.push(it); write(i); return it; });
  ipcMain.handle('memory:approve', async (_e,id:number) => { const i=read(); const f=i.find(x=>x.id===id); if(f) f.approved=true; write(i); return read().filter(m=>m.approved); });
  ipcMain.handle('memory:delete', async (_e,id:number) => { write(read().filter(x=>x.id!==id)); return read().filter(m=>m.approved); });
}
