.PHONY: help build test lint clean run-integration run-design run-capability docker-build docker-up docker-down ubecli install-ubecli uninstall-ubecli

# UbeCLI version info
VERSION ?= 1.0.0
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS := -ldflags "-X main.version=$(VERSION) -X main.buildDate=$(BUILD_DATE) -X main.gitCommit=$(GIT_COMMIT)"
INSTALL_PATH := /usr/local/bin

help: ## Display this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build: ## Build all services
	@echo "Building all services..."
	@go build -o bin/integration-service ./cmd/integration-service
	@go build -o bin/design-service ./cmd/design-service
	@go build -o bin/capability-service ./cmd/capability-service
	@echo "Build complete!"

test: ## Run tests
	@echo "Running tests..."
	@go test -v ./...

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@go test -cover -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

lint: ## Run linter
	@echo "Running linter..."
	@go vet ./...
	@go fmt ./...

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -f coverage.out coverage.html
	@echo "Clean complete!"

run-integration: ## Run integration service
	@echo "Starting integration service..."
	@go run ./cmd/integration-service/main.go

run-design: ## Run design service
	@echo "Starting design service..."
	@go run ./cmd/design-service/main.go

run-capability: ## Run capability service
	@echo "Starting capability service..."
	@go run ./cmd/capability-service/main.go

docker-build: ## Build Docker images
	@echo "Building Docker images..."
	@docker-compose build

docker-up: ## Start all services with Docker Compose
	@echo "Starting services..."
	@docker-compose up -d
	@echo "Services started! Check status with: docker-compose ps"

docker-down: ## Stop all services
	@echo "Stopping services..."
	@docker-compose down

docker-logs: ## View Docker logs
	@docker-compose logs -f

mod-tidy: ## Tidy Go modules
	@echo "Tidying Go modules..."
	@go mod tidy

mod-download: ## Download Go modules
	@echo "Downloading Go modules..."
	@go mod download

install-tools: ## Install development tools
	@echo "Installing development tools..."
	@go install golang.org/x/tools/cmd/goimports@latest
	@echo "Tools installed!"

# UbeCLI targets
ubecli: ## Build ubecli binary with version info
	@echo "Building ubecli..."
	@go build $(LDFLAGS) -o cmd/ubecli/ubecli ./cmd/ubecli
	@echo "Build complete: cmd/ubecli/ubecli"
	@echo "Version: $(VERSION), Commit: $(GIT_COMMIT), Date: $(BUILD_DATE)"

install-ubecli: ubecli ## Install ubecli to system PATH (requires sudo)
	@echo "Installing ubecli to $(INSTALL_PATH)..."
	@if [ -w "$(INSTALL_PATH)" ]; then \
		cp cmd/ubecli/ubecli $(INSTALL_PATH)/ubecli; \
	else \
		echo "Note: $(INSTALL_PATH) requires elevated permissions."; \
		echo "Run: sudo make install-ubecli"; \
		sudo cp cmd/ubecli/ubecli $(INSTALL_PATH)/ubecli; \
	fi
	@chmod +x $(INSTALL_PATH)/ubecli
	@echo "Installed! Run 'ubecli -version' to verify."

uninstall-ubecli: ## Remove ubecli from system PATH (requires sudo)
	@echo "Removing ubecli from $(INSTALL_PATH)..."
	@if [ -f "$(INSTALL_PATH)/ubecli" ]; then \
		if [ -w "$(INSTALL_PATH)" ]; then \
			rm $(INSTALL_PATH)/ubecli; \
		else \
			sudo rm $(INSTALL_PATH)/ubecli; \
		fi; \
		echo "Uninstalled successfully."; \
	else \
		echo "ubecli not found in $(INSTALL_PATH)"; \
	fi
