// VELO preload - safe bridge between UI and main process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('velo', {
  ai: {
    chat: (msg, history) => ipcRenderer.invoke('ai:chat', msg, history),
    setKey: (key) => ipcRenderer.invoke('ai:setkey', key)
  },
  memory: {
    get: () => ipcRenderer.invoke('mem:get'),
    add: (t) => ipcRenderer.invoke('mem:add', t),
    clear: () => ipcRenderer.invoke('mem:clear')
  },
  notes: {
    get: () => ipcRenderer.invoke('notes:get'),
    save: (n) => ipcRenderer.invoke('notes:save', n)
  },
  tasks: {
    get: () => ipcRenderer.invoke('tasks:get'),
    save: (t) => ipcRenderer.invoke('tasks:save', t)
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (p) => ipcRenderer.invoke('config:set', p)
  },
  pc: {
    open: (n) => ipcRenderer.invoke('pc:open', n),
    run: (c) => ipcRenderer.invoke('pc:run', c),
    action: (a) => ipcRenderer.invoke('pc:action', a),
    info: () => ipcRenderer.invoke('pc:systeminfo')
  },
  browser: { open: (u) => ipcRenderer.invoke('browser:open', u) },
  clipboard: {
    write: (t) => ipcRenderer.invoke('clipboard:write', t),
    read: () => ipcRenderer.invoke('clipboard:read')
  }
});
