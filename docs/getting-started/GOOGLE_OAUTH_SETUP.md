# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the IntentR application.

## Prerequisites

1. A Google Cloud Platform account
2. A project in Google Cloud Console

## Step 1: Create OAuth 2.0 Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** for user type
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add scopes: `userinfo.email` and `userinfo.profile`
   - Save and continue

## Step 2: Configure OAuth Client

1. Select **Web application** as the application type
2. Add a name for your OAuth client (e.g., "IntentR Auth")
3. Add **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   http://localhost:5173
   ```
4. Add **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/google/callback
   http://localhost:5173/auth/google/callback
   ```
5. Click **Create**
6. **Important**: Copy the **Client ID** and **Client Secret** - you'll need these for configuration

## Step 3: Configure Environment Variables

### Backend (Auth Service)

Add the following environment variables to your auth service configuration:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URL=http://localhost:3000/auth/google/callback
```

You can set these in:
- `.env` file (for development)
- System environment variables
- Docker/Kubernetes secrets (for production)

### Example .env file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/intentr

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_REDIRECT_URL=http://localhost:3000/auth/google/callback

# Server
PORT=8083
```

## Step 4: Start the Auth Service

Make sure your auth service is running with the OAuth environment variables:

```bash
cd cmd/auth-service
export GOOGLE_CLIENT_ID="your_client_id"
export GOOGLE_CLIENT_SECRET="your_client_secret"
export GOOGLE_REDIRECT_URL="http://localhost:3000/auth/google/callback"
export DATABASE_URL="postgresql://user:password@localhost:5432/intentr"
export JWT_SECRET="your_jwt_secret"
go run main.go
```

Or use a `.env` file and a tool like `godotenv` or `direnv`.

## Step 5: Test the Integration

1. Start the frontend application:
   ```bash
   cd web-ui
   npm run dev
   ```

2. Navigate to the login page: `http://localhost:3000/login`

3. Click the **"Sign in with Google"** button

4. You should be redirected to Google's OAuth consent screen

5. After authorizing, you'll be redirected back to the application and logged in

## Production Deployment

For production deployment:

1. Update the **Authorized JavaScript origins** and **Authorized redirect URIs** in Google Cloud Console with your production URLs:
   ```
   https://yourdomain.com
   https://yourdomain.com/auth/google/callback
   ```

2. Update the `GOOGLE_REDIRECT_URL` environment variable to match:
   ```
   GOOGLE_REDIRECT_URL=https://yourdomain.com/auth/google/callback
   ```

3. Ensure all secrets are stored securely (use secret management systems, not plain text files)

## Troubleshooting

### "OAuth not configured" error
- Verify that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check the auth service logs for OAuth configuration status

### "Invalid redirect URI" error
- Ensure the redirect URI in your Google Cloud Console matches exactly
- Check for trailing slashes and http vs https

### "Invalid state parameter" error
- This is a security measure to prevent CSRF attacks
- Try clearing your browser cookies and try again
- Ensure the auth service is running continuously (state tokens have a 5-minute expiration)

### Users can't sign in
- Check that the OAuth consent screen is published (not in "Testing" mode) or add test users
- Verify the scopes (`userinfo.email` and `userinfo.profile`) are configured

## Security Notes

1. **Never commit secrets**: Don't commit `.env` files with real credentials to version control
2. **Use HTTPS in production**: Always use HTTPS for production deployments
3. **Rotate secrets regularly**: Periodically update your OAuth credentials
4. **Limit scopes**: Only request the minimum scopes needed (email and profile)
5. **Monitor usage**: Regularly check your Google Cloud Console for unusual activity

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
