/* VELO v2.2 - Renderer (Indian voice + mic fixes) */
const $ = (id) => document.getElementById(id);
const V = window.velo;
let currentDir = null;
let ttsOn = true;

/* ====== TOAST ====== */
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

/* ====== NAVIGATION ====== */
document.querySelectorAll('.nav-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
    var view = $('view-' + btn.dataset.view);
    if (view) view.classList.add('active');
  });
});

/* ====== INDIAN VOICE (Web Speech + Google TTS) ====== */
let indianVoice = null;
function findIndianVoice() {
  var voices = speechSynthesis.getVoices();
  if (voices.length === 0) return;
  var keywords = ['indian', 'hindi', 'heera', 'hemant', 'leela', 'veena', 'deepa', 'female'];
  for (var k = 0; k < keywords.length; k++) {
    for (var v = 0; v < voices.length; v++) {
      if (voices[v].name.toLowerCase().indexOf(keywords[k]) !== -1) {
        indianVoice = voices[v];
        $('voice-status').textContent = 'Voice: ' + voices[v].name.split(' ')[0];
        return;
      }
    }
  }
  // Fallback: any English voice
  var enVoice = voices.find(function(v) { return v.lang.indexOf('en') === 0; });
  if (enVoice) indianVoice = enVoice;
}
speechSynthesis.onvoiceschanged = findIndianVoice;
setTimeout(findIndianVoice, 1000);

// TTS using Google Translate (free, Hindi accent)
async function speakGoogle(text) {
  try {
    var shortText = text.length > 200 ? text.substring(0, 200) : text;
    var url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=hi&q=' + encodeURIComponent(shortText);
    var ctx = new AudioContext();
    var resp = await fetch(url);
    var buffer = await resp.arrayBuffer();
    var decoded = await ctx.decodeAudioData(buffer);
    var source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.start();
  } catch(e) {
    speakWebSpeech(text);
  }
}

function speakWebSpeech(text) {
  var u = new SpeechSynthesisUtterance(text);
  u.lang = indianVoice ? indianVoice.lang : 'en-IN';
  u.rate = 0.95;
  u.pitch = 1.15;
  if (indianVoice) u.voice = indianVoice;
  speechSynthesis.speak(u);
}

function speak(text) {
  if (ttsOn && text) {
    speakGoogle(text);
  }
}

/* ====== MICROPHONE (continuous, auto-restart) ====== */
let recognition = null;
let isListening = false;

function initMic() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $('voice-status-badge').className = 'status-badge warn';
    $('voice-status-badge').textContent = 'Mic not available';
    return false;
  }
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';

  recognition.onresult = function(event) {
    var last = event.results[event.results.length - 1];
    if (last.isFinal) {
      var said = last[0].transcript.trim();
      $('voice-text').textContent = 'You said: ' + said;

      // Wake word check
      var lower = said.toLowerCase();
      if (lower.indexOf('hey velo') !== -1 || lower.indexOf('ok velo') !== -1 || lower.indexOf('velo') !== -1) {
        var cmd = said.replace(/hey velo|ok velo|velo/gi, '').trim();
        if (cmd) {
          $('voice-text').textContent = 'VELO listening: ' + cmd;
          sendText(cmd);
        } else {
          $('voice-text').textContent = 'Yes? I am listening...';
        }
      }
    }
  };

  recognition.onend = function() {
    // AUTO RESTART - mic never stops
    if (isListening) {
      try { recognition.start(); } catch(e) {}
    }
  };

  recognition.onerror = function(event) {
    // Auto restart on errors too (except permission denied)
    if (event.error !== 'not-allowed' && isListening) {
      setTimeout(function() {
        try { recognition.start(); } catch(e) {}
      }, 500);
    }
  };

  return true;
}

function toggleVoice() {
  if (!recognition) {
    if (!initMic()) {
      toast('Microphone not supported in this browser');
      return;
    }
  }

  if (isListening) {
    isListening = false;
    try { recognition.stop(); } catch(e) {}
    $('voice-ring').classList.remove('listening');
    $('voice-fab').classList.remove('listening');
    $('voice-text').textContent = 'Press the mic or say "Hey Velo" to start';
    $('voice-status-badge').textContent = 'Mic ready';
    $('voice-status-badge').className = 'status-badge ok';
    $('voice-status').textContent = '';
  } else {
    isListening = true;
    try { recognition.start(); } catch(e) {
      toast('Mic error: ' + e.message);
      return;
    }
    $('voice-ring').classList.add('listening');
    $('voice-fab').classList.add('listening');
    $('voice-text').textContent = 'Listening... Say "Hey Velo"';
    $('voice-status-badge').textContent = 'Listening...';
    $('voice-status-badge').className = 'status-badge ok';
    $('voice-status').textContent = 'Listening';
  }
}

// Voice FAB in sidebar
$('voice-fab').addEventListener('click', toggleVoice);

// Init mic on load
initMic();

/* ====== CHAT ====== */
var messagesEl = $('messages');
var history = [];

function addMsg(role, text, extra) {
  var d = document.createElement('div');
  d.className = 'msg ' + role + (extra ? ' ' + extra : '');
  d.textContent = text;
  messagesEl.appendChild(d);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return d;
}

function sendText(text) {
  if (!text || !text.trim()) return;
  text = text.trim();
  addMsg('user', text);
  history.push({ role: 'user', content: text });
  var typing = addMsg('bot', 'VELO soch raha hai...', 'typing');
  V.ai.chat(text, history.slice(-20)).then(function(res) {
    typing.remove();
    if (res.ok) {
      addMsg('bot', res.response);
      history.push({ role: 'assistant', content: res.response });
      speak(res.response);
    } else {
      var errMsg = addMsg('err', res.response);
      if (res.needsKey) {
        toast('Settings mein Groq API key daalo (free from console.groq.com)');
        $('chat-status').textContent = 'No API key';
        $('chat-status').className = 'status-badge warn';
      }
    }
  }).catch(function(e) {
    typing.remove();
    addMsg('err', 'Error: ' + e.message);
  });
}

function sendMessage() {
  var inp = $('chat-input');
  var txt = inp.value;
  inp.value = '';
  sendText(txt);
}

$('send-btn').addEventListener('click', sendMessage);

/* ====== FILES ====== */
async function listFiles(dir) {
  currentDir = dir || null;
  var data = await V.file.list(dir);
  var list = $('file-list');
  list.innerHTML = '';
  if (data.error) { list.innerHTML = '<p style="color:var(--danger)">Error: ' + data.error + '</p>'; return; }
  if (!Array.isArray(data)) data = [];
  if (currentDir) {
    var parent = currentDir.split('/').slice(0, -1).join('/') || currentDir.split('/').slice(0, -1).join('/');
    var parentRow = document.createElement('div');
    parentRow.className = 'file-row';
    parentRow.innerHTML = '<span class="icon">&#128193;</span><span class="name">.. (up)</span>';
    parentRow.onclick = function() { listFiles(parent); };
    list.appendChild(parentRow);
  }
  data.forEach(function(ent) {
    var row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = '<span class="icon">' + (ent.isDir ? '&#128193;' : '&#128196;') + '</span>' +
      '<span class="name">' + ent.name + '</span>' +
      '<span class="actions">' +
        '<button class="btn-sm">Open</button>' +
        '<button class="btn-sm danger">Delete</button>' +
      '</span>';
    row.querySelector('.btn-sm').onclick = function(e) {
      e.stopPropagation();
      if (ent.isDir) listFiles(ent.path);
      else V.file.open(ent.path);
    };
    row.querySelector('.btn-sm.danger').onclick = function(e) {
      e.stopPropagation();
      if (confirm('Delete ' + ent.name + '?')) {
        V.file.delete(ent.path).then(function(r) {
          if (!r.cancelled) { toast(r.ok ? 'Deleted' : 'Error: ' + r.error); listFiles(currentDir); }
        });
      }
    };
    list.appendChild(row);
  });
}

async function searchFiles() {
  var q = $('file-search').value.trim();
  if (!q) { listFiles(currentDir); return; }
  var data = await V.file.search(q, currentDir);
  var list = $('file-list');
  list.innerHTML = '';
  if (!Array.isArray(data)) data = [];
  data.forEach(function(ent) {
    var row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = '<span class="icon">' + (ent.isDir ? '&#128193;' : '&#128196;') + '</span>' +
      '<span class="name">' + ent.name + '</span>' +
      '<span class="actions"><button class="btn-sm">Open</button></span>';
    row.querySelector('.btn-sm').onclick = function(e) {
      e.stopPropagation();
      if (ent.isDir) listFiles(ent.path);
      else V.file.open(ent.path);
    };
    list.appendChild(row);
  });
}

async function chooseFolder() {
  var dir = await V.file.choosedir();
  if (dir) listFiles(dir);
}

// Load files on view switch
document.querySelector('[data-view="files"]').addEventListener('click', function() { if (!$('file-list').children.length) listFiles(); });

/* ====== SETTINGS ====== */
async function saveSettings() {
  var key = $('settings-key').value.trim();
  if (!key) { toast('Please paste your Groq API key'); return; }
  var res = await V.settings.save(key);
  if (res.ok) {
    $('key-status').textContent = 'Key saved successfully!';
    $('key-status').className = 'key-status saved';
    $('chat-status').textContent = 'Groq ready';
    $('chat-status').className = 'status-badge ok';
    toast('API key saved! Chat ready.');
  }
}

// Load settings on view
document.querySelector('[data-view="settings"]').addEventListener('click', async function() {
  var s = await V.settings.get();
  if (s.hasKey) {
    $('key-status').textContent = 'API key: ' + s.key;
    $('key-status').className = 'key-status saved';
  }
});

/* ====== NOTES ====== */
async function loadNotes() {
  var notes = await V.notes.get();
  var list = $('notes-list');
  list.innerHTML = '';
  if (!Array.isArray(notes)) notes = [];
  notes.reverse().forEach(function(n) {
    var div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = '<div class="content">' + n.text + '<div class="meta">' + new Date(n.time).toLocaleString() + '</div></div>' +
      '<button class="btn-sm danger">Delete</button>';
    div.querySelector('.btn-sm').onclick = function() {
      V.notes.delete(n.id).then(function() { loadNotes(); });
    };
    list.appendChild(div);
  });
}
async function addNote() {
  var inp = $('note-input');
  var text = inp.value.trim();
  if (!text) return;
  await V.notes.add(text);
  inp.value = '';
  toast('Note saved');
  loadNotes();
}
document.querySelector('[data-view="notes"]').addEventListener('click', loadNotes);

/* ====== PC CONTROL ====== */
function openApp() {
  var app = $('pc-app').value.trim();
  if (!app) { toast('Enter app name'); return; }
  V.pc.openapp(app).then(toast);
}

/* ====== GITHUB ====== */
async function gitCmd(cmd) {
  var dir = $('git-dir').value.trim();
  var args = cmd.split(' ');
  var res = await V.git.exec(dir, args);
  $('git-output').textContent = res;
}

/* ====== BROWSER ====== */
function openBrowser() {
  var url = $('browser-url').value.trim();
  if (!url) { toast('Enter URL'); return; }
  if (url.indexOf('http') !== 0 && url.indexOf('.') === -1) {
    V.browser.search(url).then(toast);
  } else {
    V.browser.open(url).then(toast);
  }
}

/* ====== REMINDERS ====== */
async function loadReminders() {
  var reminders = await V.reminders.get();
  var list = $('reminders-list');
  list.innerHTML = '';
  if (!Array.isArray(reminders)) reminders = [];
  reminders.forEach(function(r) {
    var div = document.createElement('div');
    div.className = 'list-item' + (r.done ? ' done' : '');
    div.innerHTML = '<div class="content">' + r.title + '<div class="meta">' + (r.time || '') + '</div></div>' +
      '<button class="btn-sm">' + (r.done ? 'Undo' : 'Done') + '</button>' +
      '<button class="btn-sm danger">Delete</button>';
    div.querySelector('.btn-sm').onclick = function() {
      V.reminders.toggle(r.id).then(function() { loadReminders(); });
    };
    div.querySelector('.btn-sm.danger').onclick = function() {
      V.reminders.delete(r.id).then(function() { loadReminders(); });
    };
    list.appendChild(div);
  });
}
async function addReminder() {
  var title = $('reminder-title').value.trim();
  var time = $('reminder-time').value.trim();
  if (!title) return;
  await V.reminders.add(title, time);
  $('reminder-title').value = '';
  $('reminder-time').value = '';
  toast('Reminder added');
  loadReminders();
}
document.querySelector('[data-view="reminders"]').addEventListener('click', loadReminders);

/* ====== CALENDAR ====== */
async function loadEvents() {
  var events = await V.calendar.get();
  var list = $('events-list');
  list.innerHTML = '';
  if (!Array.isArray(events)) events = [];
  events.forEach(function(ev) {
    var div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = '<div class="content"><strong>' + ev.title + '</strong>' +
      (ev.desc ? '<br>' + ev.desc : '') +
      '<div class="meta">' + (ev.date || '') + '</div></div>' +
      '<button class="btn-sm danger">Delete</button>';
    div.querySelector('.btn-sm').onclick = function() {
      V.calendar.delete(ev.id).then(function() { loadEvents(); });
    };
    list.appendChild(div);
  });
}
async function addEvent() {
  var title = $('event-title').value.trim();
  var date = $('event-date').value;
  if (!title || !date) { toast('Title and date required'); return; }
  await V.calendar.add(title, date);
  $('event-title').value = '';
  toast('Event added');
  loadEvents();
}
document.querySelector('[data-view="calendar"]').addEventListener('click', loadEvents);

/* ====== MEMORY ====== */
async function loadMemory() {
  var mem = await V.memory.get();
  var list = $('memory-list');
  list.innerHTML = '';
  if (!Array.isArray(mem)) mem = [];
  mem.forEach(function(m) {
    var div = document.createElement('div');
    div.className = 'list-item' + (m.approved ? '' : '');
    div.innerHTML = '<div class="content"><strong>' + m.key + '</strong><br>' + m.value + '</div>' +
      (!m.approved ? '<button class="btn-sm">Approve</button>' : '') +
      '<button class="btn-sm danger">Delete</button>';
    if (!m.approved) {
      div.querySelector('.btn-sm').onclick = function() {
        V.memory.approve(m.id).then(function() { loadMemory(); });
      };
    }
    div.querySelector('.btn-sm.danger').onclick = function() {
      V.memory.delete(m.id).then(function() { loadMemory(); });
    };
    list.appendChild(div);
  });
}
async function addMemory() {
  var k = $('mem-key').value.trim();
  var v = $('mem-value').value.trim();
  if (!k || !v) return;
  await V.memory.add(k, v);
  $('mem-key').value = '';
  $('mem-value').value = '';
  toast('Remembered!');
  loadMemory();
}
document.querySelector('[data-view="memory"]').addEventListener('click', loadMemory);

/* ====== INIT ====== */
// Load settings on start
V.settings.get().then(function(s) {
  if (s.hasKey) {
    $('key-status').textContent = 'Saved: ' + s.key;
    $('key-status').className = 'key-status saved';
  }
});

// Auto-focus chat on load
setTimeout(function() {
  if ($('chat-input')) $('chat-input').focus();
}, 500);

// Keyboard shortcut for voice
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'm') {
    e.preventDefault();
    toggleVoice();
  }
});

console.log('VELO v2.2 renderer loaded - Indian voice + mic auto-restart');
