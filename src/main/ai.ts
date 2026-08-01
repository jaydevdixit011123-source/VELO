import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

function loadApiKey(): string {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const m = fs.readFileSync(envPath, 'utf8').match(/GROQ_API_KEY=(.+)/);
      if (m) return m[1].trim();
    }
  } catch (e) {}
  return '';
}

export function setupAIHandlers() {
  ipcMain.handle('ai:chat', async (_e, message: string, history: any[]) => {
    const key = loadApiKey();
    if (!key) {
      return { ok: false, response: 'No Groq API key set. Get a FREE key at https://console.groq.com/keys', needsKey: true };
    }
    try {
      const messages = [
        { role: 'system', content: 'You are VELO, a helpful AI assistant. Keep answers concise.' },
        ...(history || []).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: message }
      ];
      const res = await fetch(GROQ_API, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages, max_tokens: 1024, temperature: 0.7 })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, response: 'Groq error (HTTP ' + res.status + '): ' + ((err as any).error?.message || res.statusText) };
      }
      const data: any = await res.json();
      return { ok: true, response: data.choices?.[0]?.message?.content || '(no response)' };
    } catch (e: any) {
      return { ok: false, response: 'Error: ' + (e.message || e) };
    }
  });

  ipcMain.handle('ai:setkey', async (_e, key: string) => {
    try { fs.writeFileSync(path.join(process.cwd(), '.env'), 'GROQ_API_KEY=' + key, 'utf8'); } catch (e) {}
    return { ok: true };
  });

  ipcMain.handle('ai:status', async () => ({ hasKey: !!loadApiKey() }));
}
