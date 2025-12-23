# IntentR Web UI

Modern React-based web interface for the IntentR capability management platform, built with the Ford Design System.

## Features

- **React 19** with TypeScript
- **Vite** for fast development and optimized builds
- **React Router** for client-side routing
- **Ford Design System** - Material Design-based UI components
- **Axios** for API communication
- **Context API** for state management

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
web-ui/
├── src/
│   ├── api/              # API client and service integrations
│   │   ├── client.ts     # Axios instances for each microservice
│   │   └── services.ts   # API service methods
│   ├── components/       # Reusable Ford Design System components
│   │   ├── Alert.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── index.ts
│   ├── context/          # React Context for state management
│   │   └── AppContext.tsx
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Capabilities.tsx
│   │   ├── Designs.tsx
│   │   ├── Integrations.tsx
│   │   └── index.ts
│   ├── styles/           # CSS stylesheets
│   │   └── ford-design-system.css
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles
├── .env                  # Environment variables
├── .env.example          # Environment variables template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Pages

### Dashboard
- Overview of IntentR platform
- Quick access cards to main features

### Capabilities
- View and manage SAFe capabilities
- Displays implemented capabilities with IDs and badges

### Designs
- Manage design artifacts from Figma
- Configure Figma integration
- Browse design files, comments, and versions

### Integrations
- View status of backend microservices
- Manage external tool integrations
- Monitor service health

## Backend Services

The UI connects to three microservices:

- **Integration Service** (port 8080) - Figma API integration
- **Design Service** (port 8081) - Design artifact management
- **Capability Service** (port 8082) - Capability tracking

Configure service URLs in `.env` file.

## Ford Design System

The UI uses the official Ford Motor Company design system with:

- Ford blue color palette (#081534, #133A7C, #2A6BAC, #47A8E5)
- Roboto font family
- Material Design principles
- Responsive grid system
- Accessible components (WCAG AA)

## Components

All components are TypeScript-based with proper type definitions:

- `<Button variant="primary|secondary|accent|outlined|text" />`
- `<Card title="..." image={true|false} />`
- `<Alert type="info|success|warning|error" />`
- `<Header title="..." subtitle="..." />`
- `<Navigation items={[{path, label}]} />`

## State Management

Uses React Context API for global state:

```typescript
import { useApp } from './context/AppContext';

const { state, setLoading, setError, setUser } = useApp();
```

## API Integration

Service clients are pre-configured:

```typescript
import { integrationService, designService, capabilityService } from './api/services';

// Example usage
const health = await integrationService.getHealth();
const file = await integrationService.getFigmaFile(fileId);
```

## License

Private - Product Team
