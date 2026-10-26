# Campus Lost & Found

> **College Project** — Automated Deployment of a Node.js Application Using Ansible

A web application that lets campus students report and browse lost-and-found items. The project demonstrates a complete DevOps workflow: local Node.js development → Git → Ansible automation → PM2 process management → systemd supervision → Nginx reverse proxy on an Ubuntu server.

---

## Table of Contents

1. [Project Aim](#1-project-aim)
2. [Technologies and Their Roles](#2-technologies-and-their-roles)
3. [Architecture and Request Flow](#3-architecture-and-request-flow)
4. [File Structure](#4-file-structure)
5. [Running Locally on macOS](#5-running-locally-on-macos)
6. [Testing the Endpoints](#6-testing-the-endpoints)
7. [GitHub Setup — Push `main`](#7-github-setup--push-main)
8. [Creating and Pushing `demo-update`](#8-creating-and-pushing-demo-update)
9. [Preparing the Ubuntu Server and SSH](#9-preparing-the-ubuntu-server-and-ssh)
10. [Configure Ansible Inventory](#10-configure-ansible-inventory)
11. [Initial Deployment (version 1.0.0)](#11-initial-deployment-version-100)
12. [Code-Only Update (version 1.1.0)](#12-code-only-update-version-110)
13. [Verifying the Update](#13-verifying-the-update)
14. [Demonstration Sequence](#14-demonstration-sequence)
15. [Troubleshooting](#15-troubleshooting)
16. [Lecturer Presentation Notes](#16-lecturer-presentation-notes)

---

## 1. Project Aim

Lost-and-found management is a real campus need. This project solves it with a simple web board while demonstrating **automated, repeatable server deployment** — the same steps that software teams use in industry.

**Key learning objectives:**
- Build a working Node.js/Express REST API and server-rendered front-end.
- Use Git branching to manage versioned releases.
- Automate server configuration with Ansible (infrastructure as code).
- Manage the application process reliably with PM2 and systemd.
- Serve the application publicly through Nginx.

---

## 2. Technologies and Their Roles

| Technology | Role |
|---|---|
| **Node.js & Express** | Web server, REST API, serves static files |
| **HTML / CSS / JS** | Front-end — no framework, just browser standards |
| **npm + package-lock.json** | Dependency management; `npm ci` gives reproducible installs |
| **Git & GitHub** | Version control, source of truth for deployments |
| **Ansible** | Automates every server task — installs software, configures Nginx, deploys code |
| **PM2 (`pm2-runtime`)** | Starts the Node.js process and keeps it in the foreground for systemd |
| **systemd** | Supervises the PM2 process; restarts it on failure; starts at boot |
| **Nginx** | Reverse proxy — accepts public HTTP on port 80, forwards to Node.js on port 3000 |
| **Jinja2 templates** | Ansible renders config files from variables, avoiding hardcoded values |

---

## 3. Architecture and Request Flow

```
Browser (Student's laptop / phone)
        │  HTTP :80
        ▼
  ┌─────────────┐
  │    Nginx    │  Reverse proxy, security headers, access logs
  └──────┬──────┘
         │  HTTP :3000 (localhost only)
         ▼
  ┌─────────────────────┐
  │  Node.js / Express  │  app.js — serves HTML, REST API, health/version
  │  (process: pm2-     │
  │   runtime)          │
  └─────────────────────┘
         │ supervised by
         ▼
  ┌─────────────┐        ┌─────────────────────────────┐
  │   systemd   │        │  In-memory item list         │
  │  (service:  │        │  (seeded with sample items,  │
  │campus-lost- │        │   reset on service restart)  │
  │  found)     │        └─────────────────────────────┘
  └─────────────┘
```

**Request path:**
1. Student opens `http://YOUR_SERVER_IP/` in a browser.
2. Nginx receives the connection on port 80.
3. Nginx proxies the request to `http://127.0.0.1:3000`.
4. Express serves `public/index.html`.
5. The browser's `app.js` calls `GET /api/items` → Express returns the item list as JSON.
6. Cards are rendered in the DOM using `textContent` (no XSS risk).
7. A student submits the form → `POST /api/items` → Express validates and stores the item → response returns the new item → the card is prepended without a page reload.

---

## 4. File Structure

```
campus-lost-found/
├── app.js                   ← Express server (entry point)
├── config/
│   └── appConfig.js         ← Single source of truth: version & deployment message
├── ecosystem.config.js      ← PM2 process configuration
├── package.json
├── package-lock.json        ← Committed; ensures reproducible installs
├── public/
│   ├── index.html           ← Website HTML
│   ├── styles.css           ← All styling
│   └── app.js               ← Front-end JavaScript (fetch, form, DOM)
├── ansible/
│   ├── ansible.cfg          ← Ansible settings
│   ├── inventory.ini.example← Template — copy to inventory.ini and fill in
│   ├── group_vars/
│   │   └── all.yml          ← All deployment variables (repo URL, branch, user…)
│   ├── playbook.yml         ← Main Ansible playbook
│   └── templates/
│       ├── campus-lost-found.service.j2  ← systemd unit template
│       └── campus-lost-found.nginx.conf.j2 ← Nginx config template
├── .gitignore
└── README.md
```

> `ansible/inventory.ini` is in `.gitignore` — it holds your server IP and SSH key path. Never commit it.

---

## 5. Running Locally on macOS

**Prerequisites:** Node.js ≥ 18, npm ≥ 9. Check with `node -v` and `npm -v`.

```bash
# 1. Clone your repo (after you have pushed it to GitHub)
git clone https://github.com/YOUR_USERNAME/campus-lost-found.git
cd campus-lost-found

# 2. Install dependencies from the lockfile
npm ci

# 3. Start the server
npm start

# 4. Open in browser
open http://localhost:3000
```

To stop the server, press **Ctrl + C** in the terminal.

---

## 6. Testing the Endpoints

With the server running locally (`npm start`), open a new terminal:

```bash
# Health check
curl http://localhost:3000/health

# Version
curl http://localhost:3000/version

# List items
curl http://localhost:3000/api/items

# Submit a new item
curl -X POST http://localhost:3000/api/items \
     -H "Content-Type: application/json" \
     -d '{"name":"Red Scarf","description":"Left in the library, second floor.","status":"Lost"}'

# Validation error (missing description)
curl -X POST http://localhost:3000/api/items \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Item","status":"Found"}'

# Expected JSON responses (formatted for readability):
# /health  → {"status":"ok","uptime":...,"timestamp":"..."}
# /version → {"version":"1.0.0","deploymentMessage":"Deployment demonstration version 1.0.0","appName":"Campus Lost & Found"}
# POST 400 → {"error":"Item description is required."}
```

---

## 7. GitHub Setup — Push `main`

```bash
# Inside the project directory:
git init
git add .
git commit -m "Initial commit: Campus Lost & Found v1.0.0"
git branch -M main

# Create the repo on GitHub (github.com → New Repository → campus-lost-found)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/campus-lost-found.git
git push -u origin main
```

After this step, copy the repository URL and update `ansible/group_vars/all.yml`:
```yaml
git_repo_url: "https://github.com/YOUR_USERNAME/campus-lost-found.git"
```
Commit and push that change too:
```bash
git add ansible/group_vars/all.yml
git commit -m "Set GitHub repo URL in group_vars"
git push
```

---

## 8. Creating and Pushing `demo-update`

This branch contains version 1.1.0 — used for the live update demo. Create it **after** pushing `main`.

```bash
# Create demo-update branch from main
git checkout -b demo-update

# Edit config/appConfig.js — change these two values:
#   version:           '1.1.0',
#   deploymentMessage: 'Deployment update successful — version 1.1.0',
```

Edit [`config/appConfig.js`](./config/appConfig.js) so it reads:

```js
module.exports = {
  appName:           'Campus Lost & Found',
  version:           '1.1.0',
  deploymentMessage: 'Deployment update successful — version 1.1.0',
};
```

```bash
# Commit the version bump
git add config/appConfig.js
git commit -m "Bump to v1.1.0 — demo update"

# Push the branch
git push -u origin demo-update

# Switch back to main — do NOT merge demo-update into main
git checkout main
```

Both branches are now on GitHub. The `main` branch stays at 1.0.0.

---

## 9. Preparing the Ubuntu Server and SSH

### What the Ubuntu server needs

- Ubuntu 22.04 LTS (or 20.04) — a fresh cloud VM is ideal.
- Ports **22** (SSH) and **80** (HTTP) open in the firewall / security group.
- A user with `sudo` access (usually `ubuntu` on AWS/GCP/Azure).

### What your friend's laptop needs

```bash
# macOS — install Ansible (Python-based)
pip3 install --user ansible

# or with Homebrew
brew install ansible

# Verify
ansible --version
```

### Set up SSH key access (if not already done)

On your friend's laptop:
```bash
# Generate an SSH key if one doesn't exist
ssh-keygen -t rsa -b 4096 -C "demo@campus"

# Copy the public key to the server (replace USER and IP)
ssh-copy-id ubuntu@YOUR_SERVER_IP

# Test the connection — should log in without a password
ssh ubuntu@YOUR_SERVER_IP
```

---

## 10. Configure Ansible Inventory

Inside the `ansible/` directory:

```bash
# Copy the example file
cp ansible/inventory.ini.example ansible/inventory.ini
```

Edit `ansible/inventory.ini`:

```ini
[webservers]
YOUR_SERVER_IP_HERE      # ← replace with real IP, e.g. 192.168.1.100

[webservers:vars]
ansible_user = ubuntu
ansible_ssh_private_key_file = ~/.ssh/id_rsa
```

Edit `ansible/group_vars/all.yml` — the only lines you must change before the first run:

```yaml
git_repo_url: "https://github.com/YOUR_USERNAME/campus-lost-found.git"
git_branch:   "main"
```

**Configuration checklist:**

| Item | File | Key |
|------|------|-----|
| Repository URL | `group_vars/all.yml` | `git_repo_url` |
| Active branch | `group_vars/all.yml` | `git_branch` |
| Server IP / hostname | `inventory.ini` | host entry |
| SSH username | `inventory.ini` | `ansible_user` |
| SSH private key path | `inventory.ini` | `ansible_ssh_private_key_file` |
| Application port | `group_vars/all.yml` | `app_port` |

---

## 11. Initial Deployment (version 1.0.0)

All commands are run from the `ansible/` directory on your friend's laptop.

```bash
cd ansible/

# Verify Ansible can reach the server
ansible -i inventory.ini webservers -m ping

# Run the full playbook (installs everything and deploys)
ansible-playbook -i inventory.ini playbook.yml
```

This will:
1. Install Git, Node.js (v20 LTS via NodeSource), npm, Nginx.
2. Install PM2 globally.
3. Create the `nodeapp` system user and `/opt/campus-lost-found/` directory.
4. Clone the `main` branch from GitHub.
5. Run `npm ci` to install dependencies.
6. Write the systemd unit file from the Jinja2 template.
7. Write the Nginx config from the Jinja2 template, validate it, enable it.
8. Start and enable the `campus-lost-found` systemd service.
9. Run a health check against `http://127.0.0.1:3000/health`.

After it completes, open `http://YOUR_SERVER_IP/` in a browser — you should see the board at version 1.0.0.

---

## 12. Code-Only Update (version 1.1.0)

Before running the update, change the branch in `group_vars/all.yml`:

```yaml
git_branch: "demo-update"    # ← was "main"
```

Then run **only the `deploy` tag** — no system packages are reinstalled, no Nginx is reconfigured:

```bash
ansible-playbook -i inventory.ini playbook.yml --tags deploy
```

This will:
1. Pull the `demo-update` branch from GitHub.
2. Run `npm ci` only if files changed.
3. Restart the `campus-lost-found` systemd service so the new code is live.
4. Run health and version checks.

---

## 13. Verifying the Update

```bash
# From anywhere that can reach the server:

# Health (should always be "ok")
curl http://YOUR_SERVER_IP/health

# Version (should now show 1.1.0 after the update)
curl http://YOUR_SERVER_IP/version

# Expected after update:
# {"version":"1.1.0","deploymentMessage":"Deployment update successful — version 1.1.0","appName":"Campus Lost & Found"}
```

Or open the browser: the footer will display **"Deployment update successful — version 1.1.0"**.

---

## 14. Demonstration Sequence

This is the exact sequence for the presentation:

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | `ansible-playbook -i inventory.ini playbook.yml` | Full deployment completes, health check passes |
| 2 | Open `http://YOUR_SERVER_IP/` | Board shows 5 seed items, footer says v1.0.0 |
| 3 | `curl http://YOUR_SERVER_IP/version` | `"version":"1.0.0"` |
| 4 | Edit `group_vars/all.yml` → `git_branch: "demo-update"` | (variable file only — no code edit) |
| 5 | `ansible-playbook -i inventory.ini playbook.yml --tags deploy` | Only deploy tasks run, service restarts |
| 6 | Refresh browser | Footer shows "Deployment update successful — version 1.1.0" |
| 7 | `curl http://YOUR_SERVER_IP/version` | `"version":"1.1.0"` |

**Key talking point:** Steps 4–7 simulate what happens in real teams — a developer pushes a release branch, and a single Ansible command promotes it to production. No SSH into the server. No manual commands on the server. Repeatable.

---

## 15. Troubleshooting

### SSH / Ansible connection

```bash
# Test connection manually
ssh -i ~/.ssh/id_rsa ubuntu@YOUR_SERVER_IP

# Debug Ansible verbosity
ansible-playbook -i inventory.ini playbook.yml -vvv
```

Common issues:
- **"Permission denied (publickey)"** — the public key is not in `~/.ssh/authorized_keys` on the server. Re-run `ssh-copy-id`.
- **"Host key verification failed"** — run `ssh-keyscan YOUR_SERVER_IP >> ~/.ssh/known_hosts` or set `host_key_checking = False` in `ansible.cfg` (already done).

### npm / Node.js on the server

```bash
# On the server (ssh in):
node --version
npm --version
pm2-runtime --version

# Check application logs
journalctl -u campus-lost-found -f
journalctl -u campus-lost-found --since "5 minutes ago"
```

### PM2 / systemd service

```bash
# On the server:
systemctl status campus-lost-found
systemctl restart campus-lost-found

# Check app is listening on port 3000
ss -tlnp | grep 3000
curl http://127.0.0.1:3000/health
```

### Nginx

```bash
# On the server:
nginx -t                          # test config syntax
systemctl status nginx
systemctl reload nginx

# Check Nginx logs
tail -f /var/log/nginx/campus-lost-found-error.log
```

### Application not reachable on port 80

```bash
# Check firewall rules (Ubuntu UFW)
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp

# Or check cloud provider security group — ensure port 80 is open inbound.
```

---

## 16. Lecturer Presentation Notes

> Use this as a speaking guide.

**What the project does:**
"This is a Campus Lost & Found bulletin board. Students can report a lost or found item, and it appears on the board in real time without refreshing the page. Items are stored in memory on the server."

**What makes it a DevOps project:**
"The deployment is fully automated using Ansible. With a single command, Ansible installs all the required software on a fresh Ubuntu server — Node.js, Nginx, PM2 — configures them using templates, and starts the application as a proper system service supervised by systemd. If the application crashes, systemd restarts it automatically."

**The update demonstration:**
"I prepared a second version of the application — version 1.1.0 — on a separate Git branch called `demo-update`. To update the live server, I change one variable in the Ansible configuration to point at that branch, then run the deploy command. Ansible pulls the new code, reinstalls dependencies if needed, and restarts the service. No manual SSH session. No manual commands on the server. This is how real deployments work."

**Nginx and PM2:**
"Nginx sits in front as a reverse proxy. It accepts requests on port 80 — the standard web port — and forwards them to the Node.js application running on port 3000. This is a standard production pattern. PM2 keeps Node.js running in the foreground so systemd can track and supervise it properly."

**Key endpoints for the demo:**
- `http://YOUR_SERVER_IP/` — the live website.
- `http://YOUR_SERVER_IP/health` — always returns `{"status":"ok"}`.
- `http://YOUR_SERVER_IP/version` — returns the currently deployed version and message.

---

*This project was built as a college assignment to demonstrate automated Node.js deployment using Ansible on an Ubuntu server.*
Change 1
