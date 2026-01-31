# Windows Developers - Pre-Push Hook Setup

## TL;DR

**Option 1 (Easiest): Use Git Bash**
```bash
# Already works - no extra setup needed!
chmod +x .git/hooks/pre-push
git push  # Hook runs automatically
```

**Option 2: Use PowerShell**
```powershell
# See WINDOWS_SETUP.md for detailed instructions
git config core.hooksPath .git/hooks
```

---

## Why Multiple Options?

Windows developers have different terminal preferences:

### **1. Git Bash** ✅ RECOMMENDED
- **What it is**: Unix-like terminal included with Git for Windows
- **Pros**: 
  - ✅ Works out-of-the-box with bash hooks
  - ✅ Same as macOS/Linux developers
  - ✅ Cross-platform
- **Cons**: 
  - Separate terminal from Windows Command Prompt
- **Setup**: Just run `chmod +x .git/hooks/pre-push`

### **2. Windows PowerShell** 
- **What it is**: Native Windows terminal
- **Pros**:
  - ✅ Native Windows experience
  - ✅ Can use PowerShell directly
- **Cons**:
  - Requires extra setup
  - Different from macOS/Linux
- **Setup**: See `WINDOWS_SETUP.md`

### **3. Windows Command Prompt (cmd)**
- ❌ Not supported (no hook support)
- Use Git Bash or PowerShell instead

---

## Quick Comparison

| Terminal | Bash Hook | PowerShell Hook | Status |
|----------|-----------|-----------------|--------|
| **Git Bash** | ✅ Works | ❌ Not used | **Recommended** |
| **PowerShell 5.1+** | ❌ Won't run | ✅ Works | Alternative |
| **Windows Terminal** | ✅ (if using Git Bash) | ✅ (if using PowerShell) | Depends on shell |
| **Command Prompt** | ❌ | ❌ | Not supported |

---

## Step-by-Step Setup

### **For Git Bash (All Windows)**
1. Install Git for Windows from https://git-scm.com/download/win
2. Open "Git Bash" from Start Menu
3. Navigate to repo: `cd /c/path/to/e-dossier`
4. Run: `chmod +x .git/hooks/pre-push`
5. Done! Next `git push` will run the hook

### **For PowerShell (Windows Only)**
1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Navigate to repo: `cd C:\path\to\e-dossier`
4. Run: `git config core.hooksPath .git/hooks`
5. Run: `Remove-Item .git\hooks\pre-push` (remove bash version)
6. Done! Next `git push` will use PowerShell hook

---

## Files Provided

- **`.git/hooks/pre-push`** — Bash script (for Git Bash / Unix)
- **`.git/hooks/pre-push.ps1`** — PowerShell script (for Windows PowerShell)
- **`WINDOWS_SETUP.md`** — Detailed Windows setup guide

---

## Troubleshooting

**Q: "command not found: chmod" in PowerShell**
- A: Use PowerShell hook setup instead (see above)

**Q: Hook not running on Windows**
- A: Make sure you're using the right terminal:
  - Git Bash → runs bash hook automatically
  - PowerShell → needs `core.hooksPath` configured

**Q: "ExecutionPolicy" error in PowerShell**
- A: Run as Administrator: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Q: Can I use WSL (Windows Subsystem for Linux)?**
- A: Yes! WSL is Unix-based, so just use regular bash setup

---

## For Team Leads

Recommend all Windows developers use **Git Bash** for consistency with Unix developers:
- ✅ Same hooks
- ✅ Same commands
- ✅ Easier onboarding
- ✅ Fewer support questions

If you have mixed teams, provide both scripts (which we do!) and let developers choose.
