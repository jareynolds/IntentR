# UbeCode Microservices - Quick Start Guide

Get your UbeCode microservices environment up and running on AWS EC2 in 5 minutes!

## Prerequisites

- AWS EC2 Linux instance (Amazon Linux 2 or Ubuntu)
- SSH access to the instance
- Sudo permissions

## 5-Minute Setup

### Step 1: Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/jareynolds/ubecode.git
cd ubecode
```

### Step 3: Run the Setup Script

```bash
# Make scripts executable
chmod +x scripts/setup/*.sh

# Run complete setup (installs Docker, Go, and all dependencies)
sudo ./scripts/setup/setup-ec2-environment.sh
```

This will take 5-10 minutes and install:
- System dependencies (git, wget, make, etc.)
- Docker & Docker Compose
- Go 1.21+
- Development tools

### Step 4: Configure Environment

```bash
# Log out and back in to apply Docker permissions
exit
ssh -i your-key.pem ec2-user@your-instance-ip
cd ubecode

# Configure environment (interactive)
./scripts/setup/configure-environment.sh
```

When prompted, enter your Figma Personal Access Token (or press Enter to skip).

### Step 5: Build and Start Services

```bash
# Download Go dependencies
go mod download

# Build Docker images
make docker-build

# Start all services
make docker-up
```

### Step 6: Verify Everything Works

```bash
# Check service status
./scripts/setup/manage-services.sh status

# Check health endpoints
curl http://localhost:8080/health  # Integration Service
curl http://localhost:8081/health  # Design Service
curl http://localhost:8082/health  # Capability Service

# Or use the management script
./scripts/setup/manage-services.sh health
```

## What's Running?

After setup, you have three microservices running:

1. **Integration Service** (Port 8080)
   - Figma API integration
   - Health endpoint: `/health`

2. **Design Service** (Port 8081)
   - Design artifact management
   - Health endpoint: `/health`

3. **Capability Service** (Port 8082)
   - Capability tracking
   - Health endpoint: `/health`

## Common Commands

```bash
# View logs
make docker-logs

# Stop services
make docker-down

# Restart services
./scripts/setup/manage-services.sh restart

# Check health
./scripts/setup/manage-services.sh health

# View status
./scripts/setup/manage-services.sh status
```

## Troubleshooting

### Services not starting?

```bash
# Check logs
docker-compose logs

# Verify setup
./scripts/setup/verify-setup.sh

# Check for port conflicts
netstat -tuln | grep -E ':(8080|8081|8082)'
```

### Docker permission denied?

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in
exit
ssh -i your-key.pem ec2-user@your-instance-ip

# Verify
docker ps
```

### Go not found?

```bash
# Add to PATH
export PATH=$PATH:/usr/local/go/bin
source ~/.profile

# Verify
go version
```

## Next Steps

- **Configure Figma Integration**: Add your Figma token to `.env`
- **Explore APIs**: See [API Documentation](../../docs/api/)
- **Read Architecture**: See [Architecture Docs](../../docs/architecture/)
- **Development Guide**: See [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)

## Need Help?

- **Full documentation**: `scripts/setup/README-SETUP.md`
- **Main README**: `README.md`
- **GitHub Issues**: https://github.com/jareynolds/ubecode/issues

---

**Estimated Time**: 5-10 minutes
**Difficulty**: Easy
**Last Updated**: 2025-01-09
