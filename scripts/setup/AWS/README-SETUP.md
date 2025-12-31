# IntentR Microservices - AWS EC2 Setup Guide

Complete guide for setting up the IntentR microservices environment on AWS EC2 Linux instances.

## Recent Updates (2025-12-30)

### New Features
- **arm64 Support**: Full support for AWS Graviton (ARM) instances
- **Node.js 22.x**: Required for Vite 7.x frontend build
- **Docker Buildx 0.19+**: Required for Docker Compose v5.0.1+
- **EBS Storage Setup**: Automatic detection and configuration of additional volumes
- **Docker Data Migration**: Automatically moves Docker data to EBS volume
- **Nginx Proxy Configuration**: Automatic configuration for external access via public IP

### New Scripts
- `install-nodejs.sh` - Installs Node.js 22.x from NodeSource
- `setup-storage.sh` - Configures EBS volumes and Docker storage
- `configure-nginx.sh` - Configures nginx reverse proxy for external access

### Updated Scripts
- `install-docker.sh` - Now installs Docker Buildx and supports arm64
- `setup-ec2-environment.sh` - Includes all components with skip options

### Key Requirements
| Component | Minimum Version | Reason |
|-----------|-----------------|--------|
| Node.js | 20.19+ or 22.12+ | Vite 7.x requirement |
| Docker Buildx | 0.17+ | Docker Compose v5.0.1+ requirement |
| Go | 1.21+ | Backend services |

### Important Notes - Nginx Configuration
The application uses Docker nginx for reverse proxy. Key configuration details:
- **Auth Service**: Routes `/api/auth/*` must NOT have path rewriting (service expects full path)
- **User API**: Routes `/api/users` must be proxied to auth service for user management
- **Frontend Proxy**: Set `VITE_USE_PROXY=true` in `web-ui/.env` for external access

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation Methods](#installation-methods)
- [Configuration](#configuration)
- [Service Management](#service-management)
- [Troubleshooting](#troubleshooting)
- [AWS EC2 Specific Notes](#aws-ec2-specific-notes)

## Overview

This directory contains scripts and documentation for setting up the IntentR microservices environment on AWS EC2 Linux instances. The setup includes:

- **System Dependencies**: Git, wget, curl, make, gcc, etc.
- **Docker & Docker Compose**: Container runtime and orchestration
- **Go 1.21+**: Programming language runtime
- **IntentR Services**: Three microservices (Design, Capability, Integration)
- **DELM Service** (optional): Image generation for UI Designer
- **Python 3.9+**: For DELM service

### Supported Operating Systems

- Amazon Linux 2
- Ubuntu 20.04/22.04
- Debian 10/11
- RHEL 8
- CentOS 8

## Prerequisites

### AWS EC2 Instance Requirements

**Minimum Specifications:**
- **Instance Type**: t2.micro or larger
- **vCPUs**: 1
- **Memory**: 1 GB (2 GB recommended)
- **Storage**: 20 GB EBS volume
- **Network**: Public IP address (for remote access)

**Recommended Specifications:**
- **Instance Type**: t3.medium or t3a.medium
- **vCPUs**: 2
- **Memory**: 4 GB
- **Storage**: 30 GB EBS volume (gp3)
- **Network**: VPC with internet gateway

### Security Group Configuration

Ensure your EC2 security group allows:
- **Inbound**: SSH (22) from your IP
- **Inbound**: HTTP (80) - optional, for API access
- **Inbound**: Custom TCP (8080-8082) - for microservices
- **Outbound**: All traffic (for downloading dependencies)

## Quick Start

### Option 1: Complete Automated Setup (Recommended)

Run the all-in-one setup script:

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Clone the repository
git clone https://github.com/jareynolds/intentr.git
cd intentr

# Make scripts executable
chmod +x scripts/setup/*.sh

# Run the complete setup
sudo ./scripts/setup/setup-ec2-environment.sh
```

This will install everything needed: Docker, Docker Compose, Go, and all system dependencies.

**After setup completes:**

```bash
# Log out and back in to apply Docker group permissions
exit
ssh -i your-key.pem ec2-user@your-instance-ip
cd intentr

# Configure environment
./scripts/setup/configure-environment.sh

# Build and start services
make docker-build
make docker-up

# Verify services
./scripts/setup/manage-services.sh health
```

### Option 2: Manual Step-by-Step Setup

If you prefer more control:

```bash
# 1. Update system
sudo yum update -y  # Amazon Linux
# or
sudo apt-get update && sudo apt-get upgrade -y  # Ubuntu

# 2. Install dependencies
sudo ./scripts/setup/install-dependencies.sh

# 3. Install Docker
sudo ./scripts/setup/install-docker.sh

# 4. Install Go
sudo ./scripts/setup/install-golang.sh

# 5. Log out and back in for Docker permissions
exit
# SSH back in

# 6. Clone repository (if not done)
git clone https://github.com/jareynolds/intentr.git
cd intentr

# 7. Configure environment
./scripts/setup/configure-environment.sh

# 8. Verify setup
./scripts/setup/verify-setup.sh

# 9. Build and run
make docker-build
make docker-up
```

## Installation Methods

### Method 1: All-in-One Setup Script

**File**: `setup-ec2-environment.sh`

**Features**:
- Detects Linux distribution automatically
- Installs all dependencies
- Configures Docker permissions
- Sets up Go environment
- Validates installation

**Usage**:
```bash
sudo ./scripts/setup/setup-ec2-environment.sh
```

### Method 2: Individual Component Scripts

#### Install System Dependencies

**File**: `install-dependencies.sh`

```bash
sudo ./scripts/setup/install-dependencies.sh
```

Installs: git, wget, curl, make, gcc, ca-certificates, and more.

#### Install Docker

**File**: `install-docker.sh`

```bash
sudo ./scripts/setup/install-docker.sh
```

Installs: Docker CE and Docker Compose v2

#### Install Go

**File**: `install-golang.sh`

```bash
sudo ./scripts/setup/install-golang.sh [version]

# Examples:
sudo ./scripts/setup/install-golang.sh          # Installs default (1.21.6)
sudo ./scripts/setup/install-golang.sh 1.22.0   # Installs specific version
```

## Configuration

### Environment Variables

**File**: `configure-environment.sh`

Create and configure the `.env` file:

```bash
# Interactive mode (prompts for values)
./scripts/setup/configure-environment.sh

# Non-interactive mode
./scripts/setup/configure-environment.sh --figma-token figd_your_token_here
```

**Required Environment Variables**:

| Variable | Description | Required |
|----------|-------------|----------|
| `FIGMA_TOKEN` | Figma Personal Access Token | Yes (for Figma features) |
| `INTEGRATION_SERVICE_PORT` | Integration service port | No (default: 8080) |
| `DESIGN_SERVICE_PORT` | Design service port | No (default: 8081) |
| `CAPABILITY_SERVICE_PORT` | Capability service port | No (default: 8082) |

### Getting a Figma Token

1. Go to [Figma Settings](https://www.figma.com/settings)
2. Scroll to "Personal access tokens"
3. Click "Generate new token"
4. Copy the token and add it to `.env`

### Manual .env Configuration

Create `.env` file in project root:

```bash
# IntentR Environment Configuration
FIGMA_TOKEN=figd_your_token_here
INTEGRATION_SERVICE_PORT=8080
DESIGN_SERVICE_PORT=8081
CAPABILITY_SERVICE_PORT=8082
NETWORK_NAME=intentr-network
LOG_LEVEL=info
ENV=development
```

## Service Management

### Using the Management Script

**File**: `manage-services.sh`

```bash
# Start all services
./scripts/setup/manage-services.sh start

# Stop all services
./scripts/setup/manage-services.sh stop

# Restart services
./scripts/setup/manage-services.sh restart

# Show status
./scripts/setup/manage-services.sh status

# View logs
./scripts/setup/manage-services.sh logs

# Check health
./scripts/setup/manage-services.sh health

# Build images
./scripts/setup/manage-services.sh build

# Clean up
./scripts/setup/manage-services.sh clean
```

### Using Make Commands

```bash
# Build all services
make docker-build

# Start services
make docker-up

# Stop services
make docker-down

# View logs
make docker-logs

# Build and run locally (without Docker)
make run-integration  # Terminal 1
make run-design       # Terminal 2
make run-capability   # Terminal 3
```

### Using Docker Compose Directly

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View status
docker-compose ps

# Rebuild and start
docker-compose up -d --build
```

## Verification

### Verify Setup

**File**: `verify-setup.sh`

Run comprehensive verification:

```bash
./scripts/setup/verify-setup.sh
```

This checks:
- System dependencies (Git, Docker, Go, Make)
- Docker service status
- Docker permissions
- Project files
- Go modules
- Network connectivity
- Port availability

### Manual Health Checks

```bash
# Check service health endpoints
curl http://localhost:8080/health  # Integration Service
curl http://localhost:8081/health  # Design Service
curl http://localhost:8082/health  # Capability Service

# Check Docker containers
docker-compose ps

# Check Docker logs
docker-compose logs integration-service
docker-compose logs design-service
docker-compose logs capability-service

# Check if ports are listening
netstat -tuln | grep -E ':(8080|8081|8082)'
# or
ss -tuln | grep -E ':(8080|8081|8082)'
```

## Troubleshooting

### Common Issues

#### 1. Docker Permission Denied

**Symptom**:
```
permission denied while trying to connect to the Docker daemon socket
```

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Verify
docker ps
```

#### 2. Port Already in Use

**Symptom**:
```
Error starting userland proxy: listen tcp 0.0.0.0:8080: bind: address already in use
```

**Solution**:
```bash
# Find process using port
sudo lsof -i :8080
# or
sudo netstat -tulpn | grep :8080

# Kill the process
sudo kill -9 <PID>

# Or change port in .env file
```

#### 3. Go Not in PATH

**Symptom**:
```
go: command not found
```

**Solution**:
```bash
# Add Go to PATH
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Add permanently to profile
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile
echo 'export GOPATH=$HOME/go' >> ~/.profile
echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.profile
source ~/.profile
```

#### 4. Docker Compose Not Found

**Symptom**:
```
docker-compose: command not found
```

**Solution**:
```bash
# Try Docker Compose V2 (plugin)
docker compose version

# If that works, create alias
echo 'alias docker-compose="docker compose"' >> ~/.bashrc
source ~/.bashrc

# Or reinstall Docker Compose
sudo ./scripts/setup/install-docker.sh
```

#### 5. Services Not Starting

**Check Docker logs**:
```bash
docker-compose logs
```

**Common causes**:
- Missing `.env` file
- Invalid Figma token
- Port conflicts
- Insufficient memory

**Solution**:
```bash
# Verify .env exists
ls -la .env

# Check Docker resources
docker system df
docker system prune  # Clean up if needed

# Restart services
docker-compose down
docker-compose up -d
```

#### 6. Build Failures

**Symptom**:
```
Error building service
```

**Solution**:
```bash
# Clean Docker build cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache

# Check Go modules
go mod tidy
go mod download
```

### Getting Help

If you encounter issues:

1. Check logs: `./scripts/setup/manage-services.sh logs`
2. Verify setup: `./scripts/setup/verify-setup.sh`
3. Check Docker status: `docker info`
4. Check service status: `docker-compose ps`
5. Review documentation: `README.md`

## AWS EC2 Specific Notes

### Instance Recommendations

**Development/Testing**:
- t3.medium (2 vCPU, 4 GB RAM)
- 30 GB gp3 storage

**Production**:
- t3.large or larger (2+ vCPU, 8+ GB RAM)
- 50+ GB gp3 storage
- Consider using Application Load Balancer
- Use Auto Scaling for high availability

### Security Best Practices

1. **SSH Access**:
   - Use key-based authentication only
   - Restrict SSH to your IP address
   - Consider using AWS Systems Manager Session Manager

2. **Firewall Configuration**:
   ```bash
   # Configure iptables (if needed)
   sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
   sudo iptables -A INPUT -p tcp --dport 8080:8082 -j ACCEPT
   ```

3. **Regular Updates**:
   ```bash
   # Set up automatic security updates (Ubuntu)
   sudo apt-get install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades

   # For Amazon Linux
   sudo yum install -y yum-cron
   sudo systemctl enable yum-cron
   ```

4. **IAM Roles**:
   - Attach IAM role to EC2 instance for AWS service access
   - Avoid storing AWS credentials on instance

### Cost Optimization

- Use t3a instances (cheaper than t3)
- Stop instances when not in use
- Use gp3 volumes instead of gp2
- Enable detailed monitoring only when needed
- Consider Reserved Instances for long-term use

### Backup Strategy

```bash
# Create AMI of configured instance
aws ec2 create-image \
  --instance-id i-1234567890abcdef0 \
  --name "intentr-configured-$(date +%Y%m%d)" \
  --description "IntentR microservices configured instance"
```

### Monitoring

**CloudWatch Logs**:
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/linux/amd64/latest/AmazonCloudWatchAgent.zip
unzip AmazonCloudWatchAgent.zip
sudo ./install.sh
```

**Container Logs**:
```bash
# Forward Docker logs to CloudWatch
docker-compose logs -f | logger -t intentr-services
```

## Quick Reference

### Essential Commands

```bash
# Setup
sudo ./scripts/setup/setup-ec2-environment.sh
./scripts/setup/configure-environment.sh
./scripts/setup/verify-setup.sh

# Build & Run
make docker-build
make docker-up

# Manage
./scripts/setup/manage-services.sh status
./scripts/setup/manage-services.sh logs
./scripts/setup/manage-services.sh health

# Stop
make docker-down
```

### Service URLs

- **Integration Service**: http://localhost:8080
- **Design Service**: http://localhost:8081
- **Capability Service**: http://localhost:8082
- **DELM Service**: http://localhost:3005 (optional)

### Health Endpoints

- http://localhost:8080/health
- http://localhost:8081/health
- http://localhost:8082/health
- http://localhost:3005/health (DELM)

## DELM Service Setup (Optional)

DELM provides image generation capabilities for the UI Designer page.

### Installation

```bash
# Install Python 3 (if not installed)
sudo yum install python3 python3-pip -y  # Amazon Linux
# or
sudo apt-get install python3 python3-pip -y  # Ubuntu

# Clone and install DELM
git clone https://github.com/jareynolds/delm.git
cd delm
pip3 install -r requirements.txt

# Start DELM service
python3 main.py
```

### Stable Diffusion (Apple Silicon Only)

For logo, illustration, and AI image generation:

```bash
pip3 install mflux
```

**Note**: mflux requires an Apple Silicon Mac (M1/M2/M3). On EC2 Linux instances, Stable Diffusion features will not be available.

### Running DELM as a Service

Create a systemd service file:

```bash
sudo tee /etc/systemd/system/delm.service > /dev/null <<EOF
[Unit]
Description=DELM Image Generation Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/delm
ExecStart=/usr/bin/python3 main.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable delm
sudo systemctl start delm
```

### Log Files

- Setup log: `/var/log/intentr-setup.log`
- Docker logs: `docker-compose logs`
- Service logs: `docker-compose logs <service-name>`

## Additional Resources

- [Main README](../../README.md)
- [Development Guide](../../DEVELOPMENT_GUIDE.md)
- [Architecture Documentation](../../docs/architecture/)
- [API Documentation](../../docs/api/)
- [Docker Documentation](https://docs.docker.com/)
- [Go Documentation](https://golang.org/doc/)

## Support

For issues and questions:
- GitHub Issues: https://github.com/jareynolds/intentr/issues
- Project Documentation: See README.md

---

**Last Updated**: 2025-11-23
**Version**: 1.1.0
