import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ai: {
    chat: (message: string, history: any[]) => ipcRenderer.invoke('ai:chat', message, history),
    setKey: (key: string) => ipcRenderer.invoke('ai:setkey', key),
    status: () => ipcRenderer.invoke('ai:status')
  },
  memory: {
    get: () => ipcRenderer.invoke('memory:get'),
    add: (k: string, v: string) => ipcRenderer.invoke('memory:add', k, v),
    approve: (id: number) => ipcRenderer.invoke('memory:approve', id),
    delete: (id: number) => ipcRenderer.invoke('memory:delete', id)
  },
  file: {
    list: (d?: string) => ipcRenderer.invoke('file:list', d),
    search: (q: string, d?: string) => ipcRenderer.invoke('file:search', q, d),
    rename: (o: string, n: string) => ipcRenderer.invoke('file:rename', o, n),
    delete: (p: string) => ipcRenderer.invoke('file:delete', p),
    choosedir: () => ipcRenderer.invoke('file:choosedir')
  },
  pc: {
    openapp: (a: string) => ipcRenderer.invoke('pc:openapp', a),
    screenshot: () => ipcRenderer.invoke('pc:screenshot'),
    shutdown: () => ipcRenderer.invoke('pc:shutdown')
  },
  notes: {
    save: (t: string, c: string) => ipcRenderer.invoke('notes:save', t, c),
    list: () => ipcRenderer.invoke('notes:list')
  },
  git: {
    exec: (d: string, a: string[]) => ipcRenderer.invoke('git:exec', d, a)
  },
  shell: {
    exec: (c: string) => ipcRenderer.invoke('shell:exec', c)
  }
};

contextBridge.exposeInMainWorld('velo', api);
