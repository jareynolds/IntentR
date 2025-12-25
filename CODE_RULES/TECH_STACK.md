# INTENT Technology Stack

**Part of**: MAIN_SWDEV_PLAN.md
**Framework**: INTENT (Scaled Agile With AI)

---

## Core Technologies

### Backend
- **Language**: Go 1.21+
- **Web Framework**: net/http (standard library) or gin-gonic/gin
- **Database**: PostgreSQL, MongoDB (depending on service needs)
- **ORM**: GORM or sqlx
- **Migration**: golang-migrate

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: CSS with CSS Variables, Tailwind CSS
- **State Management**: React Context

### Containerization
- **Container Runtime**: Docker
- **Image Base**: golang:1.21-alpine
- **Orchestration**: Docker Compose (dev), Kubernetes (prod)

### External Integrations
- **Figma API**: REST API integration for design assets
- **Client Library**: Custom Go client

### Development Tools
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Code Quality**: golangci-lint
- **Testing**: Go testing package, testify
- **Documentation**: godoc, Swagger/OpenAPI

### Recommended Libraries

```go
// HTTP routing
"github.com/gorilla/mux"

// Configuration
"github.com/kelseyhightower/envconfig"

// Logging
"go.uber.org/zap"

// Testing
"github.com/stretchr/testify"

// Database
"github.com/jmoiron/sqlx"
"gorm.io/gorm"
```
