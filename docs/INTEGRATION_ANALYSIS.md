# AI-Powered Integration Analysis

## Overview

The IntentR application uses Claude AI to automatically analyze integration provider APIs and generate configuration forms dynamically. This feature allows users to configure new integrations without manual form creation.

## How It Works

### First-Time Configuration

1. User navigates to **Settings** page and adds their Anthropic API key
2. User goes to **Integrations** page and clicks "Configure" on any integration
3. **Modal asks for Provider URL** - User enters the URL of their instance or API docs (e.g., `https://api.figma.com` or `https://figma.com`)
4. User clicks "Analyze Integration"
5. Backend fetches the documentation from that URL
6. Claude AI analyzes the documentation and extracts:
   - Authentication methods required
   - Required configuration fields
   - Optional configuration fields
   - Integration capabilities
   - Sample API endpoints
7. **Analysis is cached** to avoid redundant AI calls
8. Frontend displays a dynamic configuration form based on AI analysis
9. User fills in credentials and saves the configuration
10. **Configuration is saved** to localStorage

### Subsequent Configuration

1. User clicks "Configure" on a previously configured integration
2. **Existing configuration is loaded** from localStorage
3. **Cached analysis is used** - no AI call needed
4. Form is pre-populated with saved values
5. User can update fields and save changes
6. Modal auto-closes after save

## Setup Instructions

### 1. Get Anthropic API Key

1. Go to [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Create a new API key
3. Copy the key (starts with `sk-ant-`)

### 2. Add API Key to IntentR

1. Open IntentR application
2. Navigate to **Settings** page
3. Scroll to **API Keys** section
4. Paste your Anthropic API key
5. Click **Save**

### 3. Configure Integrations

1. Navigate to **Integrations** page
2. Click **Configure** on any integration (Figma, Jira, GitHub, etc.)
3. Wait for Claude to analyze the API (10-30 seconds)
4. Fill in the required fields shown in the modal
5. Click **Save Configuration**

## Technical Details

### Backend Endpoint

**Endpoint:** `POST http://localhost:8080/analyze-integration`

**Request Body:**
```json
{
  "provider_url": "https://api.example.com/docs",
  "provider_name": "Example API",
  "anthropic_key": "sk-ant-..."
}
```

**Response:**
```json
{
  "integration_name": "Example API",
  "description": "Description of what the API does",
  "auth_method": "API Key",
  "required_fields": [
    {
      "name": "api_key",
      "type": "string",
      "description": "Your API key",
      "example": "sk-...",
      "required": true
    }
  ],
  "optional_fields": [],
  "capabilities": [
    "Read data",
    "Write data"
  ],
  "sample_endpoints": {
    "get_user": "/api/user",
    "list_items": "/api/items"
  }
}
```

### Claude Model Configuration

**IMPORTANT:** The integration service uses **Claude 3 Haiku** (`claude-3-haiku-20240307`) as the default model.

**Why Haiku?**
- Most widely available across all API key tiers
- Fast response times for API analysis
- Cost-effective for this use case
- Excellent at structured data extraction

**Model Location:**
- File: `/internal/integration/analyzer.go`
- Line: `Model: "claude-3-haiku-20240307"`

**⚠️ DO NOT change the model** without testing! Other models like Claude 3.5 Sonnet or Opus may not be available depending on API key tier.

### Supported Models (in order of compatibility)

1. ✅ **claude-3-haiku-20240307** (RECOMMENDED - works with all API keys)
2. ⚠️ **claude-3-sonnet-20240229** (may require higher tier)
3. ⚠️ **claude-3-opus-20240229** (may require higher tier)
4. ❌ **claude-3-5-sonnet-20241022** (requires latest API access)

## Adding New Integrations

To add a new integration to the list:

1. Open `web-ui/src/pages/Integrations.tsx`
2. Add to the `INTEGRATIONS` array:

```typescript
{
  name: 'Your Integration',
  providerURL: 'https://api.yourintegration.com/docs',
  description: 'Brief description',
  status: 'inactive'
}
```

3. The AI will automatically analyze the API when users click Configure

## Troubleshooting

### Error: "Anthropic API key not found"
- **Solution:** Add your API key in Settings → API Keys

### Error: "model: claude-x-x not found" (404)
- **Solution:** The model is not available with your API key tier
- **Fix:** Ensure `analyzer.go` uses `claude-3-haiku-20240307`

### Error: "failed to analyze integration"
- **Possible causes:**
  - Provider URL is unreachable
  - Provider URL returns non-HTML content
  - Claude API rate limit exceeded
- **Solution:** Check backend logs with `docker-compose logs integration-service`

### Integration analysis takes too long
- **Expected time:** 10-30 seconds for Claude to analyze
- **If longer:** Check network connectivity to Anthropic API

## Caching Strategy

**Analysis Cache:**
- **Storage:** Browser localStorage
- **Key format:** `integration_analysis_{provider_url}`
- **Duration:** Permanent (until user clears browser data)
- **Purpose:** Avoid redundant Claude API calls for the same provider URL

**Configuration Cache:**
- **Storage:** Browser localStorage
- **Key format:** `integration_config_{integration_name}`
- **Contains:** Provider URL, field values, configuration timestamp
- **Purpose:** Remember user's integration settings

**Benefits:**
- ⚡ Instant configuration loading for previously configured integrations
- 💰 Reduces Claude API costs by caching analysis results
- 📶 Works offline once analysis is cached
- 🔄 Analysis is reused across all users configuring the same provider URL

**Note:** Future versions will migrate to database storage for team-wide sharing and persistence.

## Architecture

```
User Browser
    ↓
Settings Page (store API key in localStorage)
    ↓
Integrations Page (click Configure)
    ↓
Check if config exists → Load from localStorage
    ↓ (if new)
Ask for Provider URL
    ↓
Check analysis cache → Use if exists
    ↓ (if not cached)
POST /analyze-integration
    ↓
Integration Service (analyzer.go)
    ↓
Fetch Provider API Docs → Send to Claude API → Parse Response
    ↓
Cache Analysis in localStorage
    ↓
Return Structured Config Schema
    ↓
Display Dynamic Form to User
    ↓
User fills & saves → Store in localStorage
```

## Security Notes

- API keys are stored in browser localStorage (client-side only)
- API keys are sent to backend only for analysis requests
- Backend does not persist API keys
- Use environment variables for server-side API keys when possible

## Future Enhancements

- [ ] Cache API analysis results to avoid redundant Claude calls
- [ ] Support OAuth flow analysis
- [ ] Auto-detect API endpoint changes
- [ ] Test connection after configuration
- [ ] Store configurations in database per user/workspace
