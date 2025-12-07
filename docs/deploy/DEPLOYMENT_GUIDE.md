# E-Dossier v2 – Deployment & Operations Guide

**Audience:** Support / DevOps / Infra team  
**Goal:** Deploy a **fresh environment** of E-Dossier using:

- **1× DB VM** (PostgreSQL)
- **1× App VM** (Next.js + Node.js)

Setup is performed with **two automation scripts**:

- `edossier_db_setup.sh` → Database VM  
- `edossier_app_setup.sh` → Application VM  

Minimal manual steps required.

---

## 1. High-Level Architecture

E-Dossier is deployed across **two virtual machines** on the same private network:

### **DB VM — PostgreSQL**
- Ubuntu 24.04 LTS  
- PostgreSQL 16+  
- Hardened `pg_hba.conf`  
- UFW firewall  
- Nightly automated backups  
- Listens on LAN IP:5432  
- Accepts traffic **only** from App VM

### **App VM — Next.js Application**
- Ubuntu 24.04 LTS  
- Node.js 22.x + pnpm  
- Hosts E-Dossier  
- Connects to DB via `DATABASE_URL`  
- Exposes app on port `3000`  

### Example Network

- DB VM: `172.22.128.56`
- App VM: `172.22.128.57`

Required open paths:
- App VM → DB VM: `5432/tcp`
- Users → App VM: `3000/tcp` (or via Nginx later)

---

## 2. Files & Scripts

You should have two files:

```
edossier_db_setup.sh     # Run on DB VM
edossier_app_setup.sh    # Run on App VM
```

> **Run both scripts as root or with sudo on a fresh Ubuntu 24.04 VM.**

---

## 3. Prerequisites

### 3.1 VM Requirements

#### **DB VM (`EDossierdatabase`)**
- Ubuntu 24.04 LTS  
- 2 vCPU, 4 GB RAM  
- 50 GB disk  
- Must accept inbound from App VM on port `5432`

#### **App VM (`EDApplication`)**
- Ubuntu 24.04 LTS  
- 4 vCPU, 8 GB RAM  
- 80+ GB disk  
- Must accept inbound traffic on `3000/tcp`

### 3.2 Access Requirements
- SSH access with sudo  
- Internet access for apt, GitHub, NodeSource  

---

## 4. Step-by-Step Deployment

---

# 4.1 — Step 1: Setup **Database VM**

SSH into DB VM (e.g. `172.22.128.56`).

### 1. Copy script to DB VM

```bash
sudo mkdir -p /opt/edossier
cd /opt/edossier
# upload edossier_db_setup.sh
sudo chmod +x edossier_db_setup.sh
```

### 2. Run script

```bash
sudo ./edossier_db_setup.sh
```

### 3. Script prompts (recommended answers)

| Prompt | Recommended |
|--------|-------------|
| DB name | `e_dossier_v2` |
| DB user | `edossier_app` |
| Password | strong password |
| App VM IP | `172.22.128.57` |
| Listen IP | auto-detected (e.g. `172.22.128.56`) |
| Port | `5432` |
| Configure UFW? | `y` |
| Enable backups? | `y` |
| Backup directory | default |

### 4. What the script configures
- Installs PostgreSQL  
- Backs up config files  
- Updates `postgresql.conf`  
- Rewrites `pg_hba.conf` (secure, least privilege)  
- Creates DB + user  
- Sets up nightly backups  
- Configures UFW to allow only App VM  
- Prints ready-to-use **DATABASE_URL**

### 5. Example Output (copy for App VM)

```
postgresql://edossier_app:VeryStrongPassword%40123@172.22.128.56:5432/e_dossier_v2?sslmode=disable
```

### 6. Sanity checks

```bash
sudo -u postgres psql -c "\l"
sudo ufw status verbose
```

---

# 4.2 — Step 2: Setup **Application VM**

SSH into App VM (e.g. `172.22.128.57`).

### 1. Copy script to App VM

```bash
sudo mkdir -p /opt/edossier
cd /opt/edossier
# upload edossier_app_setup.sh
sudo chmod +x edossier_app_setup.sh
```

### 2. Run script

```bash
sudo ./edossier_app_setup.sh
```

### 3. Recommended answers

| Prompt | Recommended |
|--------|-------------|
| Git repo URL | default (`https://github.com/Hexmon/e-dossier.git`) |
| Branch | `main` |
| App port | `3000` |
| DB Host | `172.22.128.56` |
| DB Port | `5432` |
| DB name | `e_dossier_v2` |
| DB user | `edossier_app` |
| DB password | same from DB VM |
| Configure UFW? | `y` |
| Reset drizzle? | `y` only on a *fresh* DB |

### 4. What the app script configures

- Installs Node.js, pnpm, PostgreSQL client  
- Creates system user `nextapp`  
- Clones Git repo  
- Generates `.env` file  
- Tests DB connectivity  
- Installs dependencies, generates/migrates DB schema  
- Builds Next.js  
- Creates systemd service:

```
/etc/systemd/system/edossier.service
```

- Enables + starts the service  
- Configures UFW to allow app port

### 5. Check service

```bash
sudo systemctl status edossier.service
```

### 6. Logs

```bash
sudo journalctl -u edossier.service -n 100 --no-pager
```

### 7. Test locally

```bash
curl -v http://localhost:3000/
```

---

## 5. Accessing the Application

### Browser access
```
http://<APP_VM_IP>:3000/
```

Example:
```
http://172.22.128.57:3000/
```

If app loads without styling:
- check network firewall  
- check browser devtools for blocked JS/CSS  
- validate Next.js build completed correctly  

### (Optional) Nginx reverse proxy
Later you may add an HTTPS layer or domain — not covered here.

---

## 6. Operations (Daily Use)

### Restart app

```bash
sudo systemctl restart edossier.service
```

### View logs

```bash
sudo journalctl -u edossier.service -n 200 --no-pager
```

### Pull new code (update release)

```bash
sudo -u nextapp bash -lc "
  cd /srv/edossier-app \
  && git fetch \
  && git checkout <branch> \
  && git pull --ff-only \
  && pnpm install --frozen-lockfile \
  && pnpm run db:migrate \
  && pnpm run build
"
sudo systemctl restart edossier.service
```

### Database health checks

```bash
sudo -u postgres pg_isready
sudo systemctl status postgresql
```

---

## 7. Troubleshooting

### 7.1 App VM cannot connect to DB

Check `pg_hba.conf`:

```
host e_dossier_v2 edossier_app 172.22.128.57/32 scram-sha-256
```

Check UFW:

```bash
sudo ufw status
```

Test manually from App VM:

```bash
PGPASSWORD='PW' psql -h 172.22.128.56 -p 5432 -U edossier_app -d e_dossier_v2 -c "SELECT now();"
```

---

### 7.2 Port 3000 in use

```bash
sudo ss -ltnp | grep 3000
sudo kill -9 <PID>
sudo systemctl restart edossier.service
```

---

### 7.3 Permission issues

```bash
sudo chown -R nextapp:nextapp /srv/edossier-app
sudo chmod 640 /srv/edossier-app/.env
sudo systemctl restart edossier.service
```

---

### 7.4 Re-running scripts

- **DB script** – safe, idempotent  
- **App script** – *do not* reset drizzle in production unless planned

---

## 8. Summary Checklist

### **DB VM**
✔ Ubuntu 24.04  
✔ Run `edossier_db_setup.sh`  
✔ Note generated `DATABASE_URL`  

### **App VM**
✔ Ubuntu 24.04  
✔ Run `edossier_app_setup.sh`  
✔ Use same DB credentials  
✔ Service `active (running)`  

### **Verification**
```
curl http://localhost:3000/
http://<APP_VM_IP>:3000/
```

If UI loads with CSS/JS → **Deployment Successful**

---

**E-Dossier environment is now fully deployed and operational.**
