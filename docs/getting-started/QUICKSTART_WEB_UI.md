# UbeCode Web UI - Quick Start Guide

## Overview

The UbeCode Web UI is now fully implemented with all 6 enablers completed:

- ✅ **ENB-173294** - React Application Bootstrap
- ✅ **ENB-284951** - Ford Design System Integration
- ✅ **ENB-395762** - UI Routing and Navigation
- ✅ **ENB-486513** - Page Component Library
- ✅ **ENB-597324** - State Management System
- ✅ **ENB-648135** - Backend API Integration Layer

## Running the Web UI

### Prerequisites

- Node.js 18+ or 20+
- Backend services running (optional, UI works standalone)

### Quick Start

```bash
# Navigate to web UI directory
cd web-ui

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The application will be available at: **http://localhost:5173**

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Pages Available

### 1. Dashboard (/)
- Overview of the UbeCode platform
- Quick access cards to Capabilities, Designs, and Integrations

### 2. Capabilities (/capabilities)
- View all implemented capabilities
- Shows CAP-582341, CAP-694827, CAP-318652, CAP-471395
- Displays capability IDs and status badges

### 3. Designs (/designs)
- Manage design artifacts from Figma
- Configure Figma integration
- Access design files, comments, and versions

### 4. Integrations (/integrations)
- View status of backend microservices
- Monitor integration-service, design-service, capability-service
- Manage external tool connections

## Ford Design System

All pages use the official Ford Motor Company design system:

- **Colors**: Ford blue palette (#081534, #133A7C, #2A6BAC, #47A8E5)
- **Typography**: Roboto font family
- **Components**: Material Design-based buttons, cards, alerts
- **Responsive**: Mobile-friendly grid system
- **Accessible**: WCAG AA compliant

## Backend Integration

The UI is configured to connect to three microservices:

```
http://localhost:8080  # Integration Service (Figma)
http://localhost:8081  # Design Service
http://localhost:8082  # Capability Service
```

Configure these URLs in `web-ui/.env` if needed.

## Project Structure

```
web-ui/
├── src/
│   ├── api/              # API clients for backend services
│   ├── components/       # Ford Design System React components
│   ├── context/          # React Context for state management
│   ├── pages/            # Page components (Dashboard, etc.)
│   ├── styles/           # Ford Design System CSS
│   └── App.tsx           # Main application
├── .env                  # Environment configuration
├── package.json
└── README.md             # Detailed documentation
```

## Features Implemented

### React Components
- `<Button>` - Primary, secondary, accent, outlined, text variants
- `<Card>` - Content cards with optional images
- `<Alert>` - Info, success, warning, error messages
- `<Header>` - Application header with Ford branding
- `<Navigation>` - Sticky navigation bar

### Routing
- Client-side routing with React Router
- Four main pages with navigation
- Active link highlighting

### State Management
- React Context API for global state
- Application state (loading, error, user)
- Easy-to-use hooks (`useApp`)

### API Integration
- Axios-based HTTP clients
- Pre-configured service endpoints
- Type-safe API methods
- Error handling

## Development

### Hot Module Replacement
Changes to React components will update instantly without page reload.

### TypeScript
Full TypeScript support with strict type checking.

### Build Output
Production build creates optimized bundles in `dist/` directory.

## Next Steps

1. **Start the UI**: `npm run dev` in the `web-ui` directory
2. **Start Backend Services**: Run `docker-compose up` in the project root (optional)
3. **Explore the Pages**: Navigate through Dashboard, Capabilities, Designs, Integrations
4. **Customize**: Modify pages in `src/pages/` to add more features

## Support

For detailed documentation, see `web-ui/README.md`

---

**Status**: ✅ Fully Implemented
**Capability**: CAP-944623 (display UI)
**All Enablers**: Implemented
**Build**: Success
