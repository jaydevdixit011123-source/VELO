import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

function cfgPath() { return path.join(app.getPath('userData'), 'velo', 'config.json'); }
function getKey(): string {
  try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')).groqKey || ''; } catch { return ''; }
}
function setKey(k: string) {
  fs.mkdirSync(path.dirname(cfgPath()), { recursive: true });
  const cfg: any = {};
  try { Object.assign(cfg, JSON.parse(fs.readFileSync(cfgPath(), 'utf8'))); } catch {}
  cfg.groqKey = k;
  fs.writeFileSync(cfgPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

export function setupAIHandlers() {
  ipcMain.handle('ai:chat', async (_e, message: string, history: any[]) => {
    const key = getKey();
    if (!key) {
      return { ok: false, response: 'Pehle Settings me FREE Groq API key daalo. Ye lo: https://console.groq.com/keys', needsKey: true };
    }
    try {
      const messages = [
        { role: 'system', content: 'You are VELO, a helpful personal AI assistant. Reply in the same language the user uses (Hinglish/Hindi/English). Keep answers short and useful.' },
        ...(history || []).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: message }
      ];
      const res = await fetch(GROQ_API, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages, max_tokens: 1024, temperature: 0.7 })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        return { ok: false, response: 'Groq error (' + res.status + '): ' + ((e as any).error?.message || res.statusText) };
      }
      const data: any = await res.json();
      return { ok: true, response: data.choices?.[0]?.message?.content || '(no response)' };
    } catch (e: any) {
      return { ok: false, response: 'Error: ' + (e.message || e) };
    }
  });
  ipcMain.handle('ai:setkey', (_e, k: string) => { setKey(String(k).trim()); return { ok: true }; });
  ipcMain.handle('ai:status', () => ({ hasKey: !!getKey() }));
}