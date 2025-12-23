# IntentR Authentication System

## Overview

The IntentR application now includes a comprehensive authentication system with user management capabilities. This system supports local authentication with encrypted password storage and JWT-based session management.

## Features

- **Local Authentication**: Username/password authentication with bcrypt-encrypted passwords
- **JWT Tokens**: Secure token-based authentication with 24-hour expiration
- **User Management**: Full CRUD operations for user accounts (admin only)
- **Role-Based Access Control**: Admin and user roles with different permissions
- **Admin Panel**: Web interface for managing users (create, update, delete)
- **Protected Routes**: Frontend routes protected by authentication middleware

## Architecture

### Backend Services

**Auth Service** (Port 8083)
- Handles authentication and user management
- Endpoints:
  - `POST /api/auth/login` - User login
  - `GET /api/auth/verify` - Token verification
  - `GET /api/auth/me` - Get current user info
  - `GET /api/users` - List all users (admin only)
  - `POST /api/users` - Create new user (admin only)
  - `PUT /api/users/:id` - Update user (admin only)
  - `DELETE /api/users/:id` - Delete user (admin only)

### Database

**PostgreSQL** (Port 5432)
- Database: `intentr_db`
- User: `intentr_user`
- Tables:
  - `users` - User accounts with encrypted passwords
  - `sessions` - Session tracking (future enhancement)

### Frontend

**React Application** (Port 5173)
- Login page with form validation
- Admin panel for user management
- Role-based navigation (admin users see "Admin Panel" in sidebar)
- Protected routes using JWT tokens

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Go 1.22 or higher (for local development)
- Node.js 18+ and npm (for frontend development)

### Running the Application

1. **Start all services**:
   ```bash
   ./start.sh
   # OR
   docker-compose up -d
   ```

2. **Access the application**:
   - Frontend: http://localhost:5173
   - Auth Service: http://localhost:8083

3. **Login with default admin account**:
   - Email: `admin@intentr.local`
   - Password: `admin123`
   - **IMPORTANT**: Change this password after first login!

### Environment Variables

Create a `.env` file in the project root:

```env
# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production

# Database (used by auth-service)
DATABASE_URL=postgres://intentr_user:intentr_password@postgres:5432/intentr_db?sslmode=disable

# Figma Integration (optional)
FIGMA_TOKEN=your-figma-token
```

## User Roles

### Admin Role
- Full access to all features
- Can create, update, and delete users
- Can change user roles
- Access to Admin Panel

### User Role
- Standard application access
- Cannot access Admin Panel
- Cannot manage other users

## Security Features

1. **Password Encryption**: All passwords are hashed using bcrypt with cost 10
2. **JWT Tokens**:
   - Signed with HS256 algorithm
   - 24-hour expiration
   - Contains user ID, email, and role
3. **Protected Endpoints**: Admin endpoints require both valid token AND admin role
4. **CORS**: Configured to allow frontend access
5. **SQL Injection Prevention**: Parameterized queries throughout

## API Examples

### Login

```bash
curl -X POST http://localhost:8083/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@intentr.local","password":"admin123"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@intentr.local",
    "name": "System Administrator",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Verify Token

```bash
curl -X GET http://localhost:8083/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create User (Admin Only)

```bash
curl -X POST http://localhost:8083/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "name": "John Doe",
    "role": "user"
  }'
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

## Frontend Integration

### Using Authentication in React Components

```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password');
      // User is now logged in
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.name}!</p>
          <p>Role: {user?.role}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### Protected Routes

Routes are automatically protected using the `ProtectedRoute` component. Unauthenticated users are redirected to the login page.

### Admin-Only Features

```typescript
import { useAuth } from '../context/AuthContext';

function AdminFeature() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <div>Access denied</div>;
  }

  return <div>Admin content here</div>;
}
```

## Troubleshooting

### Cannot login
- Check that the auth-service is running: `docker-compose ps`
- Check auth-service logs: `docker-compose logs auth-service`
- Verify database is running: `docker-compose ps postgres`

### Token expired
- Tokens expire after 24 hours
- Log out and log back in to get a new token

### Admin user not working
- Check database initialization: `docker-compose logs postgres`
- Connect to database and verify user exists:
  ```bash
  docker-compose exec postgres psql -U intentr_user -d intentr_db -c "SELECT * FROM users;"
  ```

### Permission denied errors
- Ensure you're logged in as admin user
- Check token is being sent in Authorization header
- Verify user role in database

## Production Deployment

Before deploying to production:

1. **Change default admin password** immediately after first login
2. **Set strong JWT_SECRET** environment variable (use a long random string)
3. **Use strong database password** (change from default `intentr_password`)
4. **Enable SSL/TLS** for database connections
5. **Use HTTPS** for the frontend
6. **Configure proper CORS** settings (don't use `*` in production)
7. **Set up database backups**
8. **Enable rate limiting** on authentication endpoints
9. **Monitor authentication logs** for suspicious activity
10. **Consider adding 2FA** for admin accounts

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] OAuth2 integration (Google, GitHub, etc.)
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Session management and revocation
- [ ] Audit logging for admin actions
- [ ] Rate limiting on login attempts
- [ ] Account lockout after failed attempts
- [ ] Password complexity requirements
- [ ] User profile management

## Support

For issues or questions:
- Check the logs: `docker-compose logs auth-service`
- Review this documentation
- Contact the development team
