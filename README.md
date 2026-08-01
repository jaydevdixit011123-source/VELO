# VELO — Personal AI Desktop Assistant

VELO is your **free, personal AI assistant** that lives on your computer. It chats with you, remembers your preferences, manages files, takes notes, sets reminders, controls your PC, and more — all locally and privately.

## ✨ Features

- 🤖 **AI Chat** — powered by Google Gemini (free API)
- 💾 **Smart Memory** — remembers approved preferences (local, no database server needed)
- 📁 **File Manager** — search, copy, move, rename, delete files
- 🖥️ **PC Control** — open apps, take screenshots, volume, shutdown
- 🐙 **GitHub** — clone, commit, push, pull from the app
- 📝 **Notes** — quick capture
- 🛡️ **100% Free & Local** — your data stays on your machine

## 🚀 Quick Install (Windows)

### Zero native dependencies — no Visual Studio, no compiler, nothing extra needed!

1. **Install Node.js** (LTS): https://nodejs.org
2. **Download this repo**: Click **Code → Download ZIP** and extract it (or `git clone https://github.com/jaydevdixit011123-source/VELO.git`)
3. Open the folder and **double-click `setup.bat`**
4. Done — VELO opens automatically

### Manual
```bash
npm install
npm start
```

## 🔑 Get Your Free Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google → **Create API key**
3. Paste the key into VELO → **Settings**

Free tier gives plenty of daily requests for personal use.

## 🗂️ Project Structure
```
src/
├── main/          # Electron main process (desktop)
│   ├── index.ts   # App entry point
│   ├── ai.ts      # Gemini AI integration
│   ├── memory.ts  # Local memory (JSON store)
│   ├── ipc.ts     # Skills: files, PC, notes, GitHub
│   └── preload.ts # Secure bridge to UI
└── renderer/      # Desktop UI (HTML/CSS/JS)
    ├── index.html
    ├── styles.css
    └── app.js
```

## 🛠️ Tech Stack
- **Electron** — desktop shell
- **TypeScript** — safe, typed code
- **Node.js** — backend logic
- **Google Gemini** — free AI brain
- **No native modules** — installs anywhere, instantly

## 📄 License
MIT — free to use, modify, and share.
