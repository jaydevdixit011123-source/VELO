import { GoogleGenerativeAI } from '@google/generative-ai';
import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

function loadApiKey(): string {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const m = fs.readFileSync(envPath, 'utf8').match(/GEMINI_API_KEY=(.+)/);
      if (m) return m[1].trim();
    }
  } catch (e) {}
  return '';
}

export function setupAIHandlers() {
  ipcMain.handle('ai:chat', async (_e, message: string, history: any[]) => {
    const key = loadApiKey();
    if (!key) {
      return { ok: false, response: 'No Gemini API key set. Get a free one at https://aistudio.google.com/app/apikey and set it in Settings.', needsKey: true };
    }
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const chat = model.startChat({ history: (history||[]).map((m:any)=>({role: m.role==='user'?'user':'model', parts:[{text:m.content}]})) });
      const result = await chat.sendMessage(message);
      return { ok: true, response: result.response.text() };
    } catch (e: any) {
      return { ok: false, response: 'Error: ' + (e.message || e) };
    }
  });
  ipcMain.handle('ai:setkey', async (_e, key: string) => {
    try { fs.writeFileSync(path.join(process.cwd(), '.env'), 'GEMINI_API_KEY='+key, 'utf8'); } catch (e) {}
    return { ok: true };
  });
  ipcMain.handle('ai:status', async () => ({ hasKey: !!loadApiKey() }));
}
