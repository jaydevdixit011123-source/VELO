// VELO v2.2 - Preload (Pure JS)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('velo', {
  ai: {
    chat: (msg, history) => ipcRenderer.invoke('ai:chat', msg, history)
  },
  settings: {
    save: (key) => ipcRenderer.invoke('settings:save', key),
    get: () => ipcRenderer.invoke('settings:get')
  },
  memory: {
    get: () => ipcRenderer.invoke('memory:get'),
    add: (k, v) => ipcRenderer.invoke('memory:add', k, v),
    approve: (id) => ipcRenderer.invoke('memory:approve', id),
    delete: (id) => ipcRenderer.invoke('memory:delete', id)
  },
  file: {
    list: (d) => ipcRenderer.invoke('file:list', d),
    search: (q, d) => ipcRenderer.invoke('file:search', q, d),
    open: (p) => ipcRenderer.invoke('file:open', p),
    delete: (p) => ipcRenderer.invoke('file:delete', p),
    choosedir: () => ipcRenderer.invoke('file:choosedir')
  },
  pc: {
    openapp: (a) => ipcRenderer.invoke('pc:openapp', a),
    shutdown: () => ipcRenderer.invoke('pc:shutdown'),
    volume: (l) => ipcRenderer.invoke('pc:volume', l)
  },
  browser: {
    open: (u) => ipcRenderer.invoke('browser:open', u),
    search: (q) => ipcRenderer.invoke('browser:search', q)
  },
  notes: {
    get: () => ipcRenderer.invoke('notes:get'),
    add: (t) => ipcRenderer.invoke('notes:add', t),
    delete: (id) => ipcRenderer.invoke('notes:delete', id)
  },
  reminders: {
    get: () => ipcRenderer.invoke('reminders:get'),
    add: (t, tm) => ipcRenderer.invoke('reminders:add', t, tm),
    toggle: (id) => ipcRenderer.invoke('reminders:toggle', id),
    delete: (id) => ipcRenderer.invoke('reminders:delete', id)
  },
  calendar: {
    get: (m) => ipcRenderer.invoke('calendar:get', m),
    add: (t, d, desc) => ipcRenderer.invoke('calendar:add', t, d, desc),
    delete: (id) => ipcRenderer.invoke('calendar:delete', id)
  },
  git: {
    exec: (d, a) => ipcRenderer.invoke('git:exec', d, a)
  }
});

console.log('VELO preload loaded');
