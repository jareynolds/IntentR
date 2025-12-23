# API Documentation

This document describes the REST API endpoints for all IntentR microservices.

## Base URLs

- **Integration Service**: `http://localhost:8080`
- **Design Service**: `http://localhost:8081`
- **Capability Service**: `http://localhost:8082`

## Common Headers

All API requests should include:

```
Content-Type: application/json
```

## Integration Service API

The Integration Service provides access to Figma design files and comments.

### Health Check

Check if the service is running and healthy.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy"
}
```

**Status Codes**:
- `200 OK`: Service is healthy

---

### Get Figma File

Retrieve a Figma file by its key.

**Endpoint**: `GET /figma/files/{fileKey}`

**Path Parameters**:
- `fileKey` (string, required): The unique identifier for the Figma file

**Example Request**:
```bash
curl http://localhost:8080/figma/files/abc123xyz
```

**Example Response**:
```json
{
  "key": "abc123xyz",
  "name": "My Design File",
  "lastModified": "2025-01-09T10:30:00Z",
  "thumbnailUrl": "https://...",
  "version": "1234567890",
  "document": {
    "id": "0:0",
    "name": "Document",
    "type": "DOCUMENT",
    "children": [
      {
        "id": "1:1",
        "name": "Page 1",
        "type": "CANVAS"
      }
    ]
  }
}
```

**Status Codes**:
- `200 OK`: File retrieved successfully
- `400 Bad Request`: File key is missing or invalid
- `401 Unauthorized`: Invalid or missing Figma token
- `404 Not Found`: File does not exist
- `500 Internal Server Error`: Server error

**Error Response**:
```json
{
  "error": "API request failed with status 404: File not found"
}
```

---

### Get Figma Comments

Retrieve all comments for a Figma file.

**Endpoint**: `GET /figma/files/{fileKey}/comments`

**Path Parameters**:
- `fileKey` (string, required): The unique identifier for the Figma file

**Example Request**:
```bash
curl http://localhost:8080/figma/files/abc123xyz/comments
```

**Example Response**:
```json
[
  {
    "id": "123456",
    "message": "This needs to be updated",
    "client_meta": "1:2",
    "created_at": "2025-01-09T10:30:00Z",
    "user_id": "789012"
  },
  {
    "id": "123457",
    "message": "Approved!",
    "client_meta": "1:3",
    "created_at": "2025-01-09T11:00:00Z",
    "user_id": "789013"
  }
]
```

**Status Codes**:
- `200 OK`: Comments retrieved successfully
- `400 Bad Request`: File key is missing or invalid
- `401 Unauthorized`: Invalid or missing Figma token
- `404 Not Found`: File does not exist
- `500 Internal Server Error`: Server error

---

### List Specifications

List all specification files from a workspace's specifications folder.

**Endpoint**: `GET /specifications/list`

**Query Parameters**:
- `workspace` (string, required): Path to the workspace folder

**Example Request**:
```bash
curl "http://localhost:8080/specifications/list?workspace=workspaces/myproject"
```

**Example Response**:
```json
{
  "files": [
    {
      "filename": "STORY-123-feature.md",
      "content": "# Story Title\n\n## Description\n..."
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Files retrieved successfully
- `400 Bad Request`: Workspace parameter missing
- `404 Not Found`: Workspace not found
- `500 Internal Server Error`: Server error

---

### Analyze Specifications

Analyze specification files using Claude AI to extract capabilities and enablers.

**Endpoint**: `POST /specifications/analyze`

**Request Body**:
```json
{
  "files": [
    {
      "filename": "story.md",
      "content": "..."
    }
  ],
  "anthropic_key": "sk-ant-..."
}
```

**Example Response**:
```json
{
  "capabilities": [
    {
      "id": "CAP-123456",
      "name": "User Authentication",
      "status": "Implemented",
      "type": "Capability",
      "enablers": ["ENB-789012"],
      "upstreamDependencies": [],
      "downstreamImpacts": []
    }
  ],
  "enablers": [
    {
      "id": "ENB-789012",
      "name": "OAuth Integration",
      "capabilityId": "CAP-123456",
      "status": "Implemented",
      "type": "Enabler"
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Analysis completed successfully
- `400 Bad Request`: Invalid request body or missing fields
- `500 Internal Server Error`: Analysis failed

---

### Generate Diagram

Generate a Mermaid diagram from specification files using Claude AI.

**Endpoint**: `POST /specifications/generate-diagram`

**Request Body**:
```json
{
  "files": [
    {
      "filename": "story.md",
      "content": "..."
    }
  ],
  "anthropic_key": "sk-ant-...",
  "diagram_type": "state",
  "prompt": "Custom prompt for generation"
}
```

**Diagram Types**:
- `state` - State machine diagram (stateDiagram-v2)
- `sequence` - Sequence diagram (sequenceDiagram)
- `data-models` - Entity-relationship diagram (erDiagram)
- `class` - Class diagram (classDiagram)

**Example Response**:
```json
{
  "diagram": "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Active: start\n  Active --> [*]: stop",
  "diagram_type": "state"
}
```

**Status Codes**:
- `200 OK`: Diagram generated successfully
- `400 Bad Request`: Invalid request body or missing fields
- `500 Internal Server Error`: Generation failed

---

### AI Chat

Send a message to Claude AI for general assistance.

**Endpoint**: `POST /ai-chat`

**Request Body**:
```json
{
  "message": "How do I implement user authentication?",
  "anthropic_key": "sk-ant-...",
  "context": "Optional context about the project"
}
```

**Example Response**:
```json
{
  "response": "To implement user authentication, you should..."
}
```

---

### Generate Code

Generate code based on specifications using Claude AI.

**Endpoint**: `POST /generate-code`

**Request Body**:
```json
{
  "specifications": "...",
  "language": "typescript",
  "anthropic_key": "sk-ant-..."
}
```

---

### List Folders

List folders and files in a workspace directory.

**Endpoint**: `GET /folders/list`

**Query Parameters**:
- `path` (string, optional): Directory path (defaults to "workspaces")

**Example Request**:
```bash
curl "http://localhost:8080/folders/list?path=workspaces/myproject"
```

**Example Response**:
```json
{
  "items": [
    {
      "name": "specifications",
      "path": "workspaces/myproject/specifications",
      "isDir": true
    },
    {
      "name": "README.md",
      "path": "workspaces/myproject/README.md",
      "isDir": false
    }
  ],
  "currentPath": "workspaces/myproject",
  "parentPath": "workspaces"
}
```

---

### Create Folder

Create a new folder in the workspaces directory.

**Endpoint**: `POST /folders/create`

**Request Body**:
```json
{
  "path": "workspaces",
  "name": "new-project"
}
```

**Example Response**:
```json
{
  "name": "new-project",
  "path": "workspaces/new-project",
  "isDir": true
}
```

---

## Design Service API

The Design Service manages design artifacts and versioning (placeholder implementation).

### Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "service": "design-service"
}
```

---

### List Designs

Retrieve a list of all designs.

**Endpoint**: `GET /designs`

**Example Request**:
```bash
curl http://localhost:8081/designs
```

**Example Response**:
```json
{
  "designs": [
    {
      "id": "1",
      "name": "Sample Design",
      "status": "active"
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Designs retrieved successfully

---

## Capability Service API

The Capability Service tracks capabilities, features, and user stories (placeholder implementation).

### Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "service": "capability-service"
}
```

---

### List Capabilities

Retrieve a list of all capabilities.

**Endpoint**: `GET /capabilities`

**Example Request**:
```bash
curl http://localhost:8082/capabilities
```

**Example Response**:
```json
{
  "capabilities": [
    {
      "id": "1",
      "name": "User Authentication",
      "status": "active"
    },
    {
      "id": "2",
      "name": "Design Import",
      "status": "planned"
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Capabilities retrieved successfully

---

## Error Handling

All services use consistent error handling patterns.

### Error Response Format

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error
- `503 Service Unavailable`: Service temporarily unavailable

---

## Rate Limiting

### Figma API Rate Limits

The Figma API has the following rate limits:
- **Standard**: 1000 requests per minute per token
- **Premium**: Higher limits available

When rate limits are exceeded, the API returns:
- Status: `429 Too Many Requests`
- Header: `Retry-After` (seconds to wait)

**Best Practices**:
- Cache responses when possible
- Implement exponential backoff
- Monitor API usage
- Use webhooks for real-time updates (when implemented)

---

## Authentication

### Figma Token

To use the Figma integration endpoints, you must set a valid Figma Personal Access Token:

1. Set the `FIGMA_TOKEN` environment variable
2. Or provide it in the `.env` file

**Example**:
```bash
export FIGMA_TOKEN=your_token_here
```

**Security Notes**:
- Never commit tokens to version control
- Rotate tokens regularly
- Use different tokens for different environments
- Store tokens securely (environment variables, secret managers)

---

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:8080/health

# Get Figma file
curl http://localhost:8080/figma/files/YOUR_FILE_KEY

# Get Figma comments
curl http://localhost:8080/figma/files/YOUR_FILE_KEY/comments
```

### Using HTTPie

```bash
# Health check
http GET http://localhost:8080/health

# Get Figma file
http GET http://localhost:8080/figma/files/YOUR_FILE_KEY

# Get Figma comments
http GET http://localhost:8080/figma/files/YOUR_FILE_KEY/comments
```

### Using Postman

1. Import the collection (to be created)
2. Set up environment variables
3. Run the requests

---

## Future Enhancements

### Planned Endpoints

#### Integration Service
- `POST /figma/files/{fileKey}/comments` - Post a new comment
- `GET /figma/projects/{projectId}` - Get project information
- `POST /webhook` - Receive Figma webhooks

#### Design Service
- `POST /designs` - Create a new design
- `GET /designs/{id}` - Get a specific design
- `PUT /designs/{id}` - Update a design
- `DELETE /designs/{id}` - Delete a design
- `GET /designs/{id}/versions` - Get design version history

#### Capability Service
- `POST /capabilities` - Create a new capability
- `GET /capabilities/{id}` - Get a specific capability
- `PUT /capabilities/{id}` - Update a capability
- `DELETE /capabilities/{id}` - Delete a capability
- `GET /capabilities/{id}/features` - Get features for a capability
- `GET /capabilities/{id}/stories` - Get stories for a capability

---

## Versioning

Currently, the API is unversioned (v1 implicit). Future versions will be indicated in the URL path:

```
/v2/figma/files/{fileKey}
```

---

## Support

For issues or questions about the API:
- Check the [README](../README.md)
- Review the [Development Guide](../DEVELOPMENT_GUIDE.md)
- Open an issue on GitHub
