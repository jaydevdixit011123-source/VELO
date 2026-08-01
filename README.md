# VELO — Personal AI Desktop Assistant

VELO is your **free, personal AI assistant** that lives on your computer. It chats with you, remembers your preferences, manages files, takes notes, sets reminders, controls your PC, and more — all locally and privately.

## ✨ Features

- 🤖 **AI Chat** — powered by Google Gemini (free API)
- 💾 **Smart Memory** — remembers your approved preferences in a local database
- 📁 **File Manager** — search, copy, move, rename, delete files
- 🖥️ **PC Control** — open apps, take screenshots, adjust volume, shut down
- 🐙 **GitHub** — clone, commit, push, pull from the app
- 📝 **Notes & Reminders** — quick capture and scheduled reminders
- 📅 **Calendar** — simple local event tracking
- 🎙️ **Voice Assistant** — talk to VELO (coming soon)
- 🧩 **Plugins** — extend with your own tools
- 🛡️ **100% Free & Local** — your data stays on your machine

## 🚀 Quick Install (Windows)

### Method 1: One-Click Setup (Easiest)
1. Download this repo (Code → Download ZIP) or clone it
2. Double-click **`setup.bat`**
3. Follow the on-screen instructions — it installs everything for you
4. Launch VELO and start chatting!

### Method 2: Manual
```bash
# 1. Clone the repo
git clone https://github.com/jaydevdixit011123-source/VELO.git
cd VELO

# 2. Install dependencies
npm install

# 3. Get a free Gemini API key (optional for chat)
#    https://aistudio.google.com/app/apikey

# 4. Create .env file and add your key
#    copy .env.example to .env and fill it in

# 5. Run VELO
npm start
```

## 🔑 Get Your Free Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google
3. Click **Create API key**
4. Copy the key and paste it into the `setup.bat` prompt or the `.env` file

The Gemini free tier gives you plenty of daily requests — enough for personal use.

## 🧠 How VELO Works

1. You ask something
2. VELO's **Intent Router** figures out what you want
3. The right **Skill** runs safely
4. VELO summarizes the result
5. Only approved info is saved to **Memory** (local SQLite)

## 🗂️ Project Structure
```
src/
├── main/          # Electron main process (desktop)
│   ├── index.ts   # App entry point
│   ├── ai.ts      # Gemini/AI integration
│   ├── memory.ts  # Memory + SQLite local DB
│   ├── skills/    # Action modules
│   ├── ipc.ts     # Communication between UI and backend
├── renderer/      # Desktop UI (HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   └── app.js
```

## 🛠️ Tech Stack
- **Electron** — desktop shell
- **TypeScript** — safe, typed code
- **Node.js** — backend logic
- **SQLite** — local database (better-sqlite3)
- **Google Gemini** — free AI brain

## 📄 License
MIT — free to use, modify, and share.
