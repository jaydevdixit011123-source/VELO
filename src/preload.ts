import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ai: {
    chat: (message: string, history: any[]) => ipcRenderer.invoke('ai:chat', message, history),
    setKey: (key: string) => ipcRenderer.invoke('ai:setkey', key),
    status: () => ipcRenderer.invoke('ai:status')
  },
  file: {
    list: (d?: string) => ipcRenderer.invoke('file:list', d),
    search: (q: string, d?: string) => ipcRenderer.invoke('file:search', q, d),
    rename: (o: string, n: string) => ipcRenderer.invoke('file:rename', o, n),
    delete: (p: string) => ipcRenderer.invoke('file:delete', p),
    choosedir: () => ipcRenderer.invoke('file:choosedir'),
    open: (p: string) => ipcRenderer.invoke('file:open', p)
  },
  pc: {
    openapp: (a: string) => ipcRenderer.invoke('pc:openapp', a),
    volume: (dir: string) => ipcRenderer.invoke('pc:volume', dir),
    shutdown: (s: number) => ipcRenderer.invoke('pc:shutdown', s),
    cancelshutdown: () => ipcRenderer.invoke('pc:cancelshutdown'),
    screenshot: () => ipcRenderer.invoke('pc:screenshot')
  },
  git: { exec: (dir: string, args: string[]) => ipcRenderer.invoke('git:exec', dir, args) },
  browser: { open: (url: string) => ipcRenderer.invoke('browser:open', url), search: (q: string) => ipcRenderer.invoke('browser:search', q) },
  notes: { list: () => ipcRenderer.invoke('notes:list'), add: (t: string, b: string) => ipcRenderer.invoke('notes:add', t, b), delete: (id: number) => ipcRenderer.invoke('notes:delete', id) },
  reminders: { list: () => ipcRenderer.invoke('reminders:list'), add: (t: string, w: string) => ipcRenderer.invoke('reminders:add', t, w), toggle: (id: number) => ipcRenderer.invoke('reminders:toggle', id), delete: (id: number) => ipcRenderer.invoke('reminders:delete', id) },
  calendar: { list: () => ipcRenderer.invoke('calendar:list'), add: (t: string, d: string) => ipcRenderer.invoke('calendar:add', t, d), delete: (id: number) => ipcRenderer.invoke('calendar:delete', id) },
  memory: { list: () => ipcRenderer.invoke('memory:list'), add: (k: string, v: string) => ipcRenderer.invoke('memory:add', k, v), delete: (id: number) => ipcRenderer.invoke('memory:delete', id) }
};

contextBridge.exposeInMainWorld('velo', api);