# 🖥️ SSH Terminal Portfolio

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-4169E1?logo=postgresql&logoColor=white)
![Fly.io](https://img.shields.io/badge/Deployed%20on-Fly.io-8A2BE2?logo=flydotio&logoColor=white)
![Cloudflare](https://img.shields.io/badge/DNS-Cloudflare-F38020?logo=cloudflare&logoColor=white)
![SSH](https://img.shields.io/badge/Access-SSH-000000?logo=gnubash&logoColor=white)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

An interactive, terminal-based portfolio accessible via SSH.  
Instead of visiting a website, users connect directly through SSH and explore a fully dynamic, keyboard-driven interface.

---

## 🚀 Live Demo

```bash
ssh ssh.nhienloc.com
```

## 🎥 Demo Preview

### Interactive SSH portfolio running inside a real terminal session.

✨ Features
- 🔐 Custom SSH Server built with Node.js (ssh2)
- 🧠 Interactive Terminal UI
- 📊 Dynamic Data Rendering (Projects, Skills, Experience, Courses)
- 🗂️ NeonDB (PostgreSQL) for persistent storage
- 🎯 Responsive Layout (adapts to terminal size)
- ✨ Animated Effects (sparkles, transitions)
- 🧭 Keyboard Navigation
    - Use ↑ ↓ to navigate
    - Use Enter to open
    - Use Esc to go back
- 🔗 Clickable Links (OSC 8 terminal hyperlinks)
- 📜 Traffic Logging (sessions, navigation, events)

## 🏗️ Architecture
```
User
  ↓
SSH Client (Terminal)
  ↓
Cloudflare DNS (ssh.nhienloc.com)
  ↓
Fly.io Edge Network
  ↓
Fly.io Machine (Node.js SSH Server)
  ↓
NeonDB (PostgreSQL)
```

## 🏗️ Tech Stack
|Layer |	Technology |
|---|---|
|Backend |	Node.js |
|SSH Server | ssh2 |
|Database	| NeonDB (PostgreSQL) |
|Deployment	| Fly.io |
|DNS Routing	| Cloudflare |
|Container	| Docker |
|UI Rendering	| ANSI escape sequences |
|ASCII Art |   Braille ASCII Art Generator |
|Name fonts |   Figlet (Standard, Slant) |

## 🎨 ASCII Art

The terminal header art is generated using:

https://github.com/LachlanArthur/Braille-ASCII-Art
https://lachlanarthur.github.io/Braille-ASCII-Art/

## 🖋️ Name Fonts
The name fonts are generated using:
https://www.figlet.org

## ⚙️ Local Development
### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ssh-terminal-portfolio.git
cd ssh-terminal-portfolio
```


### 2. Install dependencies
```bash
npm install
```
### 3. Configure environment variables

Create a .env file:

```
DATABASE_URL=your_neon_db_url
PORT=2222
SSH_HOST_KEY_PATH=./ssh_host_key
```
### 4. Run the server
```bash
node server.js
```
### 5. Connect locally
```
ssh -p 2222 localhost
```

## ☁️ Deployment
### Fly.io
```
fly deploy
```
- Uses a dedicated IPv4
- Maps port 22 → 2222
- Uses persistent volume for SSH host key

### DNS (Cloudflare)
```
ssh.nhienloc.com → Fly.io dedicated IP
```

### 🗄️ Database
- Hosted on NeonDB (PostgreSQL)
- Stores:
    - Projects
    - Skills
    - Experience
    - Courses
    - Certificates

## 🔒 Security Notes
- Runs as an isolated application (no real shell access)
- No system-level command execution
- Input sandboxed within app logic
- SSH host key persisted to avoid MITM warnings
- Session activity logging enabled

## ⚠️ Known Limitations
- Real client IP is masked by Fly.io proxy
- Cannot directly open browser from SSH (links are clickable instead)
- Terminal compatibility varies (best in modern terminals)
- Requires sufficient terminal size for full UI
## 🚧 Future Improvements
- Rate limiting & connection throttling
- Analytics dashboard for user interactions
- Session replay / activity tracking
- UI/UX polish and animations
- Multi-user customization

## 👤 Author
**Nhien Loc Bui** \
Computer Science & Cybersecurity \
Oregon State University