// VELO - Main Renderer Script
// All code runs after DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  var velo = window.velo;
  if (!velo) {
    document.body.innerHTML = '<div style="color:#fff;padding:60px 20px;text-align:center;font-family:sans-serif;background:#0f172a;height:100vh;"><h1 style="font-size:48px;">◆ VELO</h1><p style="color:#94a3b8;margin-top:20px;">Preload not ready. Please restart VELO.</p></div>';
    return;
  }

  // ===== NAVIGATION =====
  var navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      navBtns.forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
      btn.classList.add('active');
      var viewId = 'view-' + btn.dataset.view;
      var view = document.getElementById(viewId);
      if (view) view.classList.add('active');
      if (btn.dataset.view === 'files') loadFiles();
      if (btn.dataset.view === 'notes') loadNotes();
      if (btn.dataset.view === 'memory') loadMemory();
    });
  });

  // ===== CHAT =====
  var messages = document.getElementById('messages');
  var chatInput = document.getElementById('chat-input');
  var history = [];

  function addMsg(text, type) {
    if (!messages) return;
    var d = document.createElement('div');
    d.className = 'msg ' + type;
    d.textContent = text;
    messages.appendChild(d);
    messages.scrollTop = messages.scrollHeight;
  }

  async function updateStatus() {
    try {
      var s = await velo.ai.status();
      var el = document.getElementById('chat-status');
      if (el) {
        el.textContent = s.hasKey ? 'AI ready' : 'Add API key in Settings';
        el.className = 'status-badge ' + (s.hasKey ? 'ok' : 'bad');
      }
    } catch(e) { console.error('Status:', e); }
  }

  async function send() {
    if (!chatInput) return;
    var text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });
    try {
      var res = await velo.ai.chat(text, history);
      if (res.ok) {
        addMsg(res.response, 'bot');
        history.push({ role: 'model', content: res.response });
      } else {
        addMsg(res.response, 'error');
        if (res.needsKey) history.pop();
      }
    } catch(e) {
      addMsg('Error: ' + (e.message || e), 'error');
    }
  }

  var sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.addEventListener('click', send);
  if (chatInput) {
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }
  updateStatus();

  // ===== FILES =====
  var currentDir = '';
  var fileList = document.getElementById('file-list');

  async function loadFiles(dir) {
    if (!fileList) return;
    if (dir) currentDir = dir;
    try {
      var data = await velo.file.list(currentDir || undefined);
      fileList.innerHTML = '';
      var backBtn = document.createElement('button');
      backBtn.textContent = '⬆ Up';
      backBtn.onclick = function() {
        var parts = currentDir.split('\\');
        parts.pop();
        loadFiles(parts.join('\\') || '');
      };
      fileList.appendChild(backBtn);
      if (data && data.length) {
        data.forEach(function(f) {
          var item = document.createElement('div');
          item.className = 'file-item';
          item.textContent = f.isDirectory ? '📁 ' + f.name : '📄 ' + f.name;
          if (f.isDirectory) item.onclick = function() { loadFiles(f.path); };
          fileList.appendChild(item);
        });
      }
    } catch(e) { if (fileList) fileList.innerHTML = '<p>Error loading files</p>'; }
  }

  // ===== NOTES =====
  async function loadNotes() {
    var notesList = document.getElementById('notes-list');
    if (!notesList) return;
    try {
      var notes = await velo.notes.list();
      notesList.innerHTML = '';
      if (notes && notes.length) {
        notes.forEach(function(n) {
          var d = document.createElement('div');
          d.className = 'note-item';
          d.innerHTML = '<strong>' + (n.title||'') + '</strong><br><small>' + ((n.content||'').substring(0,100)) + '</small>';
          notesList.appendChild(d);
        });
      } else {
        notesList.innerHTML = '<p>No notes yet.</p>';
      }
    } catch(e) { notesList.innerHTML = '<p>Error loading notes</p>'; }
  }

  // ===== MEMORY =====
  async function loadMemory() {
    var memList = document.getElementById('memory-list');
    if (!memList) return;
    try {
      var mem = await velo.memory.get();
      memList.innerHTML = '';
      if (mem && mem.length) {
        mem.forEach(function(m) {
          var d = document.createElement('div');
          d.className = 'memory-item';
          d.textContent = (m.approved ? '✅ ' : '⏳ ') + (m.key||'') + ': ' + (m.value||'');
          memList.appendChild(d);
        });
      } else {
        memList.innerHTML = '<p>No memories yet.</p>';
      }
    } catch(e) { memList.innerHTML = '<p>Error loading memory</p>'; }
  }

  // ===== SETTINGS =====
  var saveKeyBtn = document.getElementById('save-key-btn');
  var keyInput = document.getElementById('key-input');
  if (saveKeyBtn && keyInput) {
    saveKeyBtn.addEventListener('click', async function() {
      await velo.ai.setKey(keyInput.value.trim());
      keyInput.value = '';
      updateStatus();
      alert('API Key saved!');
    });
  }

  // ===== PC CONTROL =====
  document.querySelectorAll('.pc-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var action = btn.dataset.action;
      if (action === 'screenshot') await velo.pc.screenshot();
      if (action === 'shutdown' && confirm('Shutdown PC?')) await velo.pc.shutdown();
    });
  });

  // ===== GITHUB =====
  var gitRunBtn = document.getElementById('git-run-btn');
  var gitDirInput = document.getElementById('git-dir');
  var gitCmdInput = document.getElementById('git-cmd');
  var gitOutput = document.getElementById('git-output');
  if (gitRunBtn && gitDirInput && gitCmdInput && gitOutput) {
    gitRunBtn.addEventListener('click', async function() {
      var dir = gitDirInput.value.trim() || '.';
      var args = gitCmdInput.value.trim().split(' ');
      var res = await velo.git.exec(dir, args);
      gitOutput.textContent = res.stdout || res.stderr || 'Done';
    });
  }

  console.log('✅ VELO UI ready!');
});
