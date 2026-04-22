# SSH Terminal Portfolio - Setup & Deployment Guide

## Overview

This is an SSH-accessible terminal portfolio server where users can connect via SSH and navigate your portfolio using arrow keys. The interface displays real data from your Neon PostgreSQL database in an elegant, interactive menu system.

## Features

- **SSH Access**: Users connect with `ssh your-domain.com` (no password needed)
- **Arrow Key Navigation**: Navigate between portfolio sections (Creations, Reflections, Contacts) using left/right arrows
- **Interactive Menu**: Press Enter to view detailed information for each section
- **Real-Time Data**: All portfolio data comes from your Neon PostgreSQL database
- **Beautiful Terminal UI**: Neon cyan/green colors with ASCII art header
- **Responsive**: Works with any SSH client (Terminal, PuTTY, etc.)

## Prerequisites

- Node.js 22+ (for local development)
- Fly.io account (for deployment)
- Neon PostgreSQL database with existing data
- A domain name (for custom SSH access)

## Local Development

### 1. Install Dependencies

```bash
cd ssh-terminal-portfolio
npm install
```

### 2. Set Environment Variables

Create a `.env` file:

```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require&channel_binding=require
PORT=2222
```

Replace with your actual Neon connection string.

### 3. Generate SSH Host Key

On macOS/Linux use:

```bash
ssh-keygen -t ed25519 -f /tmp/ssh_host_key -N "" -q
```

On Windows PowerShell use:

```powershell
ssh-keygen -t ed25519 -f "$env:TEMP\ssh_host_key" -N "" -q
```

Alternatively, set `SSH_HOST_KEY_PATH` to a custom path before starting the app.

### 4. Run Locally

```bash
npm start
```

The SSH server will start on port 2222.

### 5. Test SSH Connection

In another terminal:

```bash
ssh -p 2222 localhost
```

You should see the portfolio menu. Navigate with arrow keys!

## Deployment to Fly.io

### Step 1: Install Fly CLI on Windows

**Option A: Using Scoop (Recommended)**

```powershell
scoop install flyctl
```

**Option B: Using Chocolatey**

```powershell
choco install flyctl
```

**Option C: Direct Download**

1. Download from: https://github.com/superfly/flyctl/releases/latest
2. Extract `flyctl.exe` to a folder in your `PATH` (e.g., `C:\Program Files\flyctl`)
3. Verify installation:
   ```powershell
   flyctl version
   ```

### Step 2: Authenticate with Fly.io

```powershell
flyctl auth login
```

This opens a browser for authentication.

### Step 3: Create Fly.io App

```powershell
flyctl launch --name terminal-portfolio --image-label latest
```

When prompted:
- **Dockerfile**: Choose "Yes" (or copy from project if available)
- **Database**: Select "No" (using Neon externally)

### Step 4: Set Environment Variables

```powershell
flyctl secrets set DATABASE_URL="your-neon-connection-string"
flyctl secrets set PORT=2222
```

Replace `your-neon-connection-string` with your actual Neon PostgreSQL URL.

### Step 5: Deploy

```powershell
flyctl deploy
```

Fly.io will build the Docker image and deploy your SSH server.

### Step 6: Get Your Fly.io Domain

After deployment, you'll get a domain like `terminal-portfolio.fly.dev`. You can SSH into it:

```bash
ssh -p 2222 terminal-portfolio.fly.dev
```

## Setting Up a Custom Domain

### 1. Buy a Domain

Purchase a domain from any registrar (GoDaddy, Namecheap, etc.).

### 2. Point DNS to Fly.io

Add an `A` record pointing to Fly.io's IP address. Fly.io will provide this in your app dashboard.

Alternatively, use Fly.io's DNS management:

```bash
flyctl certs create your-domain.com
```

### 3. Update SSH Config (Optional)

Add to your `~/.ssh/config`:

```
Host portfolio
    HostName your-domain.com
    User root
    Port 22
```

Then connect with:

```bash
ssh portfolio
```

## Customization

### Update Contact Information

Edit `server.js` and find the `displayContacts` function:

```javascript
function displayContacts(stream) {
  // ... existing code ...
  
  stream.write(`${COLORS.green}Email:${COLORS.reset}    your-email@example.com\n`);
  stream.write(`${COLORS.green}GitHub:${COLORS.reset}   github.com/your-username\n`);
  // ... update other contact info ...
}
```

### Change Colors

The `COLORS` object at the top of `server.js` defines the terminal colors:

```javascript
const COLORS = {
  cyan: '\x1b[36m',      // Cyan text
  green: '\x1b[32m',     // Green text
  reset: '\x1b[0m',      // Reset formatting
  bold: '\x1b[1m',       // Bold text
  dim: '\x1b[2m',        // Dim text
};
```

You can change these to other ANSI color codes:
- `\x1b[31m` - Red
- `\x1b[33m` - Yellow
- `\x1b[35m` - Magenta
- `\x1b[34m` - Blue

### Modify Menu Items

Change the `MENU_ITEMS` array at the top of `server.js`:

```javascript
const MENU_ITEMS = ['Creations', 'Reflections', 'Contacts'];
```

## Database Schema

Your Neon database should have these tables:

### Required Tables

1. **projects** - Portfolio projects
   - `id` (serial, primary key)
   - `title` (varchar)
   - `description` (text)
   - `repo_url` (varchar)

2. **skills** - Technical skills
   - `skill_id` (serial, primary key)
   - `skill_name` (varchar)
   - `description` (text)
   - `skill_yearStart` (integer)

3. **experience** - Work history
   - `exp_id` (serial, primary key)
   - `title` (varchar)
   - `company` (varchar)
   - `start_date` (varchar)
   - `end_date` (varchar)
   - `description` (text)

4. **courses** - Learning courses
   - `course_id` (serial, primary key)
   - `course_name` (varchar)
   - `course_description` (text)

5. **certificates** - Certifications
   - `cert_id` (serial, primary key)
   - `name` (varchar)
   - `issuer` (varchar)
   - `date` (varchar)
   - `credential_url` (varchar)

6. **educations** - Educational institutions
   - `edu_id` (serial, primary key)
   - `edu_name` (varchar)

### Junction Tables

- **project_skills** - Links projects to skills
  - `project_id` (integer)
  - `skill_id` (integer)

- **course_educations** - Links courses to educations
  - `course_id` (integer)
  - `education_id` (integer)

## Troubleshooting

### SSH Connection Refused

1. Check if the server is running: `flyctl status`
2. Verify the domain/IP is correct
3. Check firewall settings allow port 22
4. Try with explicit port: `ssh -p 22 your-domain.com`

### Database Connection Error

1. Verify `DATABASE_URL` is set correctly
2. Check Neon database is accessible from Fly.io region
3. Ensure SSL mode is set to `require` in connection string
4. Test connection locally first

### Menu Not Displaying

1. Try resizing your terminal window
2. Check your SSH client supports ANSI colors
3. Verify terminal emulation is set to `xterm` or `xterm-256color`

### Data Not Showing

1. Verify data exists in your Neon database
2. Check database queries in `server.js` match your table structure
3. Look at Fly.io logs: `flyctl logs`

## Monitoring & Logs

View live logs:

```bash
flyctl logs
```

Monitor app status:

```bash
flyctl status
```

## Performance Tips

- Database queries are cached per session
- Connection pooling is configured (max 5 connections)
- Idle timeout is 30 seconds
- Consider adding more regions for faster access

## Security Notes

- SSH access is open to anyone (no authentication)
- Database queries are read-only (safe)
- All data displayed is public portfolio information
- For production, consider adding SSH key authentication

## File Structure

```
ssh-terminal-portfolio/
├── server.js           # Main SSH server and UI
├── package.json        # Node.js dependencies
├── Dockerfile          # Docker configuration
├── fly.toml            # Fly.io configuration
└── SETUP.md            # This file
```

## Updating Deployment

After making changes:

```bash
flyctl deploy
```

Fly.io will rebuild and redeploy automatically.

## Scaling

Fly.io automatically handles scaling. You can configure:

```bash
flyctl scale count 2  # Run 2 instances
flyctl scale memory 512  # Allocate 512MB RAM per instance
```

## Support & Resources

- Fly.io Docs: https://fly.io/docs/
- Neon Docs: https://neon.tech/docs/
- SSH2 Library: https://github.com/mscdex/ssh2

---

**Ready to showcase your portfolio via SSH!** 🚀