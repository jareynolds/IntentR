# Quick Start Guide

This guide will help you get the UbeCode application up and running in minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Go**: Version 1.21 or higher
  - Check: `go version`
  - Install: [https://golang.org/dl/](https://golang.org/dl/)

- **Docker**: Latest version
  - Check: `docker --version`
  - Install: [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)

- **Docker Compose**: Latest version
  - Check: `docker-compose --version`
  - Usually included with Docker Desktop

- **Make** (optional but recommended)
  - Check: `make --version`
  - Usually pre-installed on macOS/Linux

- **Node.js**: Version 18 or higher (for web-ui)
  - Check: `node --version`
  - Install: [https://nodejs.org/](https://nodejs.org/)

- **Python 3**: Version 3.9 or higher (for DELM service)
  - Check: `python3 --version`
  - Install: [https://www.python.org/downloads/](https://www.python.org/downloads/)

- **DELM Service** (optional, for UI Designer image generation)
  - Required for UI mockups, icons, logos, and AI image generation
  - See [DELM Setup](#delm-service-setup) section below

## Step 1: Clone the Repository

```bash
git clone https://github.com/jareynolds/ubecode.git
cd ubecode
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Figma token:

```bash
FIGMA_TOKEN=your_figma_personal_access_token
```

### Getting a Figma Token

1. Log in to [Figma](https://www.figma.com/)
2. Go to Settings → Account
3. Scroll to "Personal access tokens"
4. Click "Generate new token"
5. Give it a name (e.g., "UbeCode Development")
6. Copy the token and paste it in your `.env` file

**Note**: Keep your token secret and never commit it to version control!

## Step 3: Choose Your Setup Method

### Option A: Docker (Recommended for Quick Start)

This is the easiest way to get started:

```bash
# Build all services
make docker-build

# Start all services
make docker-up

# View logs (in a new terminal)
make docker-logs
```

Services will be available at:
- Integration Service: http://localhost:8080
- Design Service: http://localhost:8081
- Capability Service: http://localhost:8082

### Option B: Local Development

Run services locally for development:

```bash
# Terminal 1 - Integration Service
make run-integration

# Terminal 2 - Design Service
make run-design

# Terminal 3 - Capability Service
make run-capability
```

## Step 4: Verify Services Are Running

### Check Health Endpoints

```bash
# Integration Service
curl http://localhost:8080/health

# Design Service
curl http://localhost:8081/health

# Capability Service
curl http://localhost:8082/health
```

You should receive JSON responses indicating the services are healthy.

### Test Figma Integration

Replace `FILE_KEY` with an actual Figma file key you have access to:

```bash
curl http://localhost:8080/figma/files/FILE_KEY
```

You should receive information about the Figma file.

## Step 5: Run Tests

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage
```

## Step 6: Build from Source (Optional)

If you want to build the services locally:

```bash
# Build all services
make build

# Binaries will be in the bin/ directory
./bin/integration-service
```

## Step 7: DELM Service Setup (Optional)

DELM (Design Element Language Model) provides image generation capabilities for the UI Designer. This includes component mockups, icons, logos, illustrations, and AI-generated images.

### Install and Run DELM

```bash
# Clone DELM repository
git clone https://github.com/jareynolds/delm.git
cd delm

# Install Python dependencies
pip3 install -r requirements.txt

# Start DELM service (default port 3005)
python3 main.py
```

DELM will be available at: http://localhost:3005

### Stable Diffusion Support (Apple Silicon Mac)

For AI image generation features (logos, illustrations, AI images), you need to install mflux:

```bash
# Install mflux for Stable Diffusion on Apple Silicon
pip3 install mflux

# First run will download the model (requires Apple Silicon Mac)
```

**Note**: If `pip3` is not available:
```bash
# Install pip using Python's ensurepip
python3 -m ensurepip --upgrade

# Or use python3 -m pip directly
python3 -m pip install mflux
```

### DELM API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/generate/mockup` | Generate UI component mockups |
| `/generate/icon` | Generate SVG icons |
| `/generate/symbol` | Generate decorative symbols |
| `/generate/logo` | Generate logos (requires mflux) |
| `/generate/illustration` | Generate illustrations (requires mflux) |
| `/generate/ai-image` | Generate AI images (requires mflux) |
| `/icons` | List available icon names |

### Verify DELM is Running

```bash
# Check health
curl http://localhost:3005/health

# List available icons
curl http://localhost:3005/icons
```

## Common Commands

### Development

```bash
# View all available commands
make help

# Format code
make lint

# Clean build artifacts
make clean

# Download dependencies
make mod-download

# Tidy dependencies
make mod-tidy
```

### Docker

```bash
# Start services
make docker-up

# Stop services
make docker-down

# View logs
make docker-logs

# Rebuild images
make docker-build
```

## Troubleshooting

### Services won't start

1. Check if ports are already in use:
   ```bash
   lsof -i :8080
   lsof -i :8081
   lsof -i :8082
   ```

2. Kill any processes using those ports
3. Try starting the services again

### Docker build fails

1. Ensure Docker is running:
   ```bash
   docker ps
   ```

2. Check Docker disk space:
   ```bash
   docker system df
   ```

3. Clean up Docker resources if needed:
   ```bash
   docker system prune
   ```

### Figma API calls fail

1. Verify your token is set:
   ```bash
   echo $FIGMA_TOKEN
   ```

2. Check if the token is valid:
   - Log in to Figma
   - Check your token in Settings → Account

3. Ensure you have access to the file you're trying to fetch

### Tests fail

1. Ensure all dependencies are installed:
   ```bash
   go mod download
   ```

2. Run with verbose output:
   ```bash
   go test -v ./...
   ```

### Can't find `make` command

If `make` is not available, you can run commands directly:

```bash
# Instead of: make build
go build -o bin/integration-service ./cmd/integration-service

# Instead of: make test
go test ./...

# Instead of: make docker-up
docker-compose up -d
```

## Next Steps

Now that you have the services running, you can:

1. **Read the Documentation**
   - [Development Guide](DEVELOPMENT_GUIDE.md) - Comprehensive development guide
   - [Architecture Decisions](docs/architecture/) - Architecture decision records

2. **Explore the API**
   - Try different endpoints
   - Check out the Figma integration
   - Test the health endpoints

3. **Make Changes**
   - Modify a service
   - Add new endpoints
   - Write tests
   - Build and test your changes

4. **Learn About SAFe**
   - Read about capability-driven development
   - Understand the framework
   - Apply it to your development process

## Getting Help

If you encounter issues:

1. Check the [README](README.md) for more details
2. Review the [Development Guide](DEVELOPMENT_GUIDE.md)
3. Look at the [Architecture Decision Records](docs/architecture/)
4. Open an issue on GitHub

## Summary

You should now have:
- ✅ All services running (ports 8080, 8081, 8082)
- ✅ Health endpoints responding
- ✅ Figma integration configured
- ✅ Tests passing
- ✅ Development environment ready
- ✅ DELM service running (port 3005) - optional, for UI Designer
- ✅ mflux installed (Apple Silicon) - optional, for AI image generation

Happy coding!
