# 📥 How to Install VELO (Step-by-Step)

## Method 1 - Windows (Easiest)

1. **Get the files**
   - Download/Extract the VELO folder to your PC (anywhere, e.g. `C:\VELO`).

2. **Install Node.js** (only once)
   - Go to **https://nodejs.org** → download **LTS** → install (click Next, Next, Finish).
   - *If you already have Node, skip this.*

3. **Run setup**
   - Double-click **`setup.bat`** inside the VELO folder.
   - It will automatically install everything (takes ~1 min).
   - You'll see `Setup complete!` when done.

4. **Start VELO**
   - Double-click **`start.bat`**.
   - The VELO window opens. 🎉

## Method 2 - From GitHub (for developers)
```bash
git clone https://github.com/jaydevdixit011123-source/VELO.git
cd VELO
npm install
npm start
```

## 🎙️ (Optional) Add FREE AI
- Open VELO → **Settings**
- Get a free key: **https://console.groq.com/keys**
- Paste & **Save**. Done!

## ❓ Troubleshooting
| Problem | Fix |
|---------|-----|
| `node is not recognized` | Install Node.js from nodejs.org |
| `Setup failed` | Check internet, re-run setup.bat |
| Chat replies are basic | Add your free Groq key in Settings |
| Window won't open | Re-run `setup.bat` to reinstall deps |

Still stuck? Just re-run `setup.bat` - it's safe to run again.
