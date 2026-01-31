# Git Hooks Setup Guide - Windows, Mac, Linux

## Quick Setup

### **macOS / Linux (Unix-based)**
```bash
chmod +x .git/hooks/pre-push
```
✅ Done! The bash hook will run automatically on `git push`

---

### **Windows Option A: Git Bash (Recommended ✅)**

Git Bash is included with **Git for Windows** and automatically supports bash hooks.

**Setup:**
```bash
# Open Git Bash and run:
chmod +x .git/hooks/pre-push
```

**Usage:**
```bash
# Use Git Bash terminal for any git commands
git push  # ✅ Hook runs automatically
```

**If you don't have Git Bash:**
- Download: https://git-scm.com/download/win
- Install Git for Windows (includes Git Bash)
- Open "Git Bash" from Start Menu

---

### **Windows Option B: PowerShell (For Native Command Line)**

If you use **Windows Terminal** or **PowerShell** instead of Git Bash:

**Step 1: Enable PowerShell Hooks**

Create a `.git/config.local` in your repo (or edit `.git/config`):
```ini
[core]
    hooksPath = .git/hooks
```

Or run:
```powershell
git config core.hooksPath .git/hooks
```

**Step 2: Rename the hook**

The hook needs a different name for PowerShell. Git will try:
1. `pre-push` (bash) ← current
2. `pre-push.ps1` (PowerShell) ← create this

**Option 2a: Use PowerShell hook**
```powershell
# The file .git/hooks/pre-push.ps1 already exists
# Just remove/rename the bash version:
Remove-Item .git/hooks/pre-push

# Or on PowerShell 7+:
rm .git/hooks/pre-push
```

**Option 2b: Keep both hooks working**

Keep both `.git/hooks/pre-push` (bash) and `.git/hooks/pre-push.ps1` (PowerShell):
- Git Bash will use `pre-push` (bash script)
- PowerShell will use `pre-push.ps1` (PowerShell script)

**Usage:**
```powershell
git push  # ✅ Hook runs in PowerShell
```

---

## Troubleshooting

### **"permission denied: .git/hooks/pre-push"**
**Solution:** Make it executable
```bash
# Git Bash:
chmod +x .git/hooks/pre-push

# PowerShell:
icacls ".git\hooks\pre-push" /grant:r "%USERNAME%:F"
```

### **Hook not running on Windows PowerShell**
**Solution:** Check execution policy
```powershell
Get-ExecutionPolicy
```

If it says `Restricted`, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **"Build failed — push blocked" but I want to force push**
```bash
# Bypass the hook (not recommended):
git push --no-verify
```

---

## Recommended: Use Git Bash on All Platforms

The **simplest cross-platform solution** is to use **Git Bash** on all systems:

| Platform | Terminal | Command |
|----------|----------|---------|
| **Windows** | Git Bash | `bash`, then `git push` |
| **macOS** | Terminal / iTerm | `git push` |
| **Linux** | Any terminal | `git push` |

All will use the same bash-based `.git/hooks/pre-push` script.

---

## Files in This Repo

- **`.git/hooks/pre-push`** — Bash version (Unix/Linux/macOS + Git Bash)
- **`.git/hooks/pre-push.ps1`** — PowerShell version (Windows native PowerShell)

Choose based on your preferred terminal:
- ✅ **Git Bash** (cross-platform): Use `.git/hooks/pre-push`
- ✅ **PowerShell** (Windows-only): Use `.git/hooks/pre-push.ps1`
