# 📥 How to Install VELO (Step-by-Step)

## Windows

### Step 1: Install Node.js (one time)
- Go to **[nodejs.org](https://nodejs.org)**
- Download the **LTS** version
- Install it (keep all default settings, just click Next)
- Verify: open Command Prompt and type `node -v` → should show v16+

### Step 2: Download VELO
- **Clone the repo** or download as ZIP
- Extract to any folder (e.g., `Desktop/VELO`)

### Step 3: Run Setup
- **Double-click `setup.bat`**
- It will:
  1. Check if Node.js is installed
  2. Run `npm install` to get Electron
  3. Confirm everything is ready

### Step 4: Launch
- **Double-click `start.bat`**
- VELO opens in a beautiful window 🎉

---

## macOS

```bash
# Install Node.js first from nodejs.org, then:
cd VELO
npm install
npx electron .
```

## Linux

```bash
# Install Node.js, then:
cd VELO
npm install
npx electron .
```

---

## Optional: Free Groq API Key for Full AI

1. Go to **[console.groq.com/keys](https://console.groq.com/keys)**
2. Sign in with Google/GitHub (free, no card needed)
3. Click **Create API Key** → copy the key
4. Open VELO → **Settings** tab → paste the key → click **Save Key**
5. Done! VELO now uses the full AI model.

> Without a key, VELO still works in **Local Mode** with built-in smart replies.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Node.js not found" | Install Node.js from [nodejs.org](https://nodejs.org) |
| "npm install failed" | Check internet connection, try again |
| "VELO won't start" | Make sure you ran `setup.bat` first |
| "Groq API error" | Check your key is correct and active at console.groq.com |

---

Need more help? Open an issue on the GitHub repo!
