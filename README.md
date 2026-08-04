# 🚀 VELO v3.1 — Your Free, Personal AI Desktop Assistant

**VELO** is a fast, beautiful, fully free AI assistant that lives on your PC. Think of it as your own **Jarvis** — private, customisable, and completely yours.

- 🔒 **100% Local and Private** — your data never leaves your machine
- 💸 **100% Free** — works in Local Mode with no key, or unlock full AI with a **FREE** Groq key
- 🎨 **Beautiful UI** — modern glass dark theme, smooth animations, multi-theme
- ⚙️ **Fully Customisable** — model, language, theme, wake word, and more

---

## ✨ What VELO Can Do

| Area | Features |
|------|----------|
| 🧠 **AI Chat** | Natural conversation in English, Hindi and Hinglish |
| 📝 **Notes** | Create, edit and delete notes stored locally |
| ✅ **Tasks** | To-do list with toggles |
| 🧠 **Memory** | VELO remembers things you tell it, stored locally |
| 💻 **PC Control** | Open apps, lock PC, sleep, restart, shutdown, volume |
| 🖥️ **Terminal** | Run commands and see output |
| 🌐 **Browser** | Open websites or Google search |
| ⚙️ **Settings** | Model, language, theme (3 styles), wake word, API key |

---

## 🚀 Quick Install (2 minutes)

### Windows
1. **Download / clone** this repo
2. **Double-click** `setup.bat` — it checks Node.js and installs everything
3. **Double-click** `start.bat` — VELO launches! 🎉

### Requirements
- **Node.js v16+** — free from [nodejs.org](https://nodejs.org)
- **Windows / macOS / Linux**
- Internet only needed for full AI (Local Mode works offline)

---

## 🔑 Unlock Full AI (FREE, 2 min)

VELO works in **Local Mode** out of the box. To unlock the powerful AI:

1. Go to **[console.groq.com/keys](https://console.groq.com/keys)** and sign in (free, no credit card)
2. Click **Create API Key** → copy the key (it starts with `gsk_`)
3. Open VELO → **Settings** tab → paste the key → click **Save Key** ✅

Now you get a blazing-fast, free AI model. No subscription, no limits.

---

## 🎨 Customisation

| Setting | Options |
|---------|--------|
| **Model** | llama-3.3-70b, mixtral-8x7b, gemma2-9b, llama-3.1-8b |
| **Language** | English, Hindi, Hinglish |
| **Theme** | Dark (default), Light, Ocean |
| **Wake Word** | Any phrase (default: "hey velo") |

---

## 📁 Project Structure

```
VELO/
├── package.json          # Electron app (NO native deps)
├── setup.bat             # One-click install
├── start.bat             # Launch VELO
├── src/
│   ├── main/main.js      # Electron main process (all logic)
│   └── preload.js        # Secure bridge to UI
└── renderer/
    ├── index.html        # Beautiful UI
    ├── styles.css        # 3 themes
    └── renderer.js       # Frontend logic
```

---

## 🛠️ Tech Stack

- **Electron** — desktop app shell
- **Groq API** — free, ultra-fast LLM inference
- **Pure JavaScript** — no TypeScript, no build steps, no native modules
- **Local JSON storage** — all data stays on your machine

---

Made with ❤️ by Jaydev | MIT License
