# IntentR Microservices - Quick Start Guide

Get your IntentR microservices environment up and running on AWS EC2 in 10 minutes!

## Prerequisites

- AWS EC2 Linux instance (Amazon Linux 2023, Ubuntu 22.04+, or similar)
- SSH access to the instance
- Sudo permissions
- Recommended: Additional EBS volume (50GB+) for Docker storage

## Supported Configurations

| Architecture | OS | Status |
|--------------|-----|--------|
| x86_64 (amd64) | Amazon Linux 2023, Ubuntu 22.04+ | Supported |
| arm64 (aarch64) | Amazon Linux 2023, Ubuntu 22.04+ | Supported |

## 10-Minute Setup

### Step 1: Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/jareynolds/intentr.git
cd intentr
```

### Step 3: Run the Setup Script

```bash
# Make scripts executable
chmod +x scripts/setup/AWS/*.sh

# Run complete setup (installs Docker, Go, Node.js, and all dependencies)
sudo ./scripts/setup/AWS/setup-ec2-environment.sh
```

This will take 5-10 minutes and install:
- System dependencies (git, wget, make, etc.)
- Docker, Docker Compose v2.32+, and Docker Buildx 0.19+
- Go 1.24+
- Node.js 22.x (required for Vite 7.x)
- Configure additional EBS storage if available

### Step 4: Refresh Docker Permissions

```bash
# Apply Docker group membership
newgrp docker

# Or log out and back in
exit
ssh -i your-key.pem ec2-user@your-instance-ip
cd intentr
```

### Step 5: Start the Application

```bash
./start.sh
```

### Step 6: Access the Application

- **Local:** http://localhost:6175
- **External:** http://your-public-ip (requires Security Group config)

## AWS Security Group Configuration

Ensure your EC2 security group allows:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | Your IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web UI (nginx proxy) |
| Custom TCP | 6175 | 0.0.0.0/0 | Web UI (direct) |

## What's Running?

After startup, you have these services:

| Service | Port | Description |
|---------|------|-------------|
| Web UI | 6175 | React frontend (Vite dev server) |
| nginx | 80 | Reverse proxy |
| Integration Service | 9080 | Figma/AI integration |
| Design Service | 9081 | Design management |
| Capability Service | 9082 | Capability tracking |
| Auth Service | 9083 | Authentication |
| Collaboration Server | 9084 | WebSocket real-time |
| Specification API | 4001 | Markdown specs |
| Shared Workspace API | 4002 | Workspace sync |
| PostgreSQL | 6432 | Database |

## Common Commands

```bash
# Check status
./status.sh

# View logs
docker compose logs -f

# Stop all services
./stop.sh

# Restart services
./stop.sh && ./start.sh
```

## Troubleshooting

### Docker permission denied?

```bash
# Add user to docker group (already done by setup script)
sudo usermod -aG docker $USER

# Apply group membership in current session
newgrp docker

# Or log out and back in
```

### Docker Buildx version error?

The setup script installs Buildx 0.19+. If you see buildx version errors:

```bash
# Manually upgrade Buildx
sudo ./scripts/setup/AWS/install-docker.sh
```

### Vite requires Node.js 20.19+ or 22.12+?

The setup script installs Node.js 22.x. If you see this error:

```bash
# Manually install Node.js 22
sudo ./scripts/setup/AWS/install-nodejs.sh
```

### No space left on device?

If you have an additional EBS volume:

```bash
# Setup storage and move Docker data
sudo ./scripts/setup/AWS/setup-storage.sh --auto
```

### Services not accessible externally?

1. Check AWS Security Group allows port 80
2. Verify nginx is running: `docker ps | grep nginx`
3. Check the application is up: `./status.sh`
4. Verify nginx configuration: `./scripts/setup/AWS/configure-nginx.sh --verify`

### API returns HTML instead of JSON?

This means nginx isn't routing requests correctly. Fix with:

```bash
# Verify and fix nginx configuration
./scripts/setup/AWS/configure-nginx.sh

# Restart nginx
docker restart intentr-nginx-1
```

### Login or Admin page not working?

The auth service requires specific nginx configuration:

```bash
# This verifies /api/auth/ and /api/users routes are configured correctly
./scripts/setup/AWS/configure-nginx.sh --verify
```

## Additional EBS Storage (Recommended)

For production use, attach an EBS volume (50GB+ recommended):

1. In AWS Console: Create and attach an EBS volume
2. Run storage setup:
   ```bash
   sudo ./scripts/setup/AWS/setup-storage.sh --auto
   ```

This will:
- Detect the new volume
- Format it with XFS
- Mount it at /data
- Configure Docker to use /data/docker
- Add to /etc/fstab for persistence

## Environment Configuration

Create a `.env` file with your API keys:

```bash
# Required for AI features
ANTHROPIC_API_KEY=your_key_here

# Optional: Figma integration
FIGMA_TOKEN=your_figma_token

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## Next Steps

- **Configure API Keys**: Add your Anthropic API key to `.env`
- **Explore the UI**: Open http://your-public-ip in a browser
- **Read Documentation**: See [README-SETUP.md](./README-SETUP.md) for full details

## Need Help?

- **Full documentation**: `scripts/setup/AWS/README-SETUP.md`
- **Main README**: `README.md`
- **GitHub Issues**: https://github.com/jareynolds/intentr/issues

---

**Estimated Time**: 10 minutes
**Difficulty**: Easy
**Last Updated**: 2025-12-30
