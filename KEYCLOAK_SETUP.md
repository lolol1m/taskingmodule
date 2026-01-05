# Keycloak Integration Setup Guide

This guide explains how to set up and configure Keycloak authentication for the XBI Tasking Module.

## Overview

The application has been integrated with Keycloak for authentication. Keycloak provides:
- Single Sign-On (SSO) capabilities
- User management
- Token-based authentication (JWT)
- Secure password management

## Prerequisites

1. **Keycloak Server**: You need a running Keycloak instance. You can:
   - Install Keycloak locally: https://www.keycloak.org/downloads
   - Use Docker: `docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:latest start-dev`
   - Use a cloud-hosted Keycloak instance

2. **Python Dependencies**: Already installed via `requirements.txt`
   - `python-jose[cryptography]`
   - `python-keycloak`

3. **Frontend Dependencies**: Already installed
   - `keycloak-js`

## Keycloak Server Configuration

### 1. Create a Realm

1. Log in to Keycloak Admin Console (usually at `http://localhost:8080`)
2. Create a new realm called `xbi-tasking` (or use your preferred name)

### 2. Create a Client for Frontend

**IMPORTANT**: The frontend client MUST be PUBLIC (not confidential). Client secrets should NEVER be used in frontend code.

1. Go to **Clients** → **Create client**
2. Fill in the form:
   - **Client type**: OpenID Connect
   - **Client ID**: `xbi-tasking-frontend`
   - Click **Next**
3. In **Capability config**:
   - **DO NOT** enable **Client authentication** (keep it as PUBLIC)
   - Enable **Standard flow** (Authorization Code Flow)
   - Enable **PKCE Method** S256
   - Click **Next**
4. In **Login settings**:
   - **Root URL**: `http://localhost:3000`
   - **Home URL**: `http://localhost:3000`
   - **Valid redirect URIs**: `http://localhost:3000/*` and `http://localhost:3000`
   - **Web origins**: `http://localhost:3000`
   - Click **Save**

**Note**: Since this is a public client, there is NO client secret. Do not look for one in the Credentials tab.

### 3. Create a Client for Backend

1. Go to **Clients** → **Create client**
2. Fill in the form:
   - **Client type**: OpenID Connect
   - **Client ID**: `xbi-tasking-backend`
   - Click **Next**
3. In **Capability config**:
   - Enable **Client authentication** (this makes it confidential)
   - Enable **Standard flow**
   - Click **Next**
4. In **Login settings**:
   - **Valid redirect URIs**: Leave empty or set to your backend URL
   - Click **Save**
5. Go to the **Credentials** tab
6. Copy the **Client secret** - you'll need to set this as an environment variable:
   ```bash
   set KEYCLOAK_CLIENT_SECRET=your_client_secret
   ```
   **Backend Client Secret**: `your_client_secret`

### 4. Create admin Client
1. Go to **Clients** → **Create client**
2. Fill in the form:
   - **Client type**: OpenID Connect
   - **Client ID**: `xbi-tasking-admin`
   - Click **Next**
3. In **Capability config**:
   - Enable **Client authentication** (this makes it confidential)
   - Disable **Standard flow**
   - Enable **Service accounts roles**
   - Click **Next**
4. In **Login settings**:
   - **Valid redirect URIs**: Leave empty
   - Click **Save**
5. Go to the **Credentials** tab
6. Copy the **Client secret** - you'll need to set this as an environment variable in QueryManager.py
7. Go to the **Service accounts roles** tab
8. Click **Assign role**
9. Leave the filter as **Filter by client roles** (do NOT filter by realm)
10. Select from the client roles list:
    - **view-users**
    - **query-users**
    - **view-realm**

### 4. Create Realm Roles

1. Go to **Realm roles**
2. Click **Create role**
3. Create the following roles:
   - **Role name**: `admin`
   - Click **Save**
   - Repeat to create: **Role name**: `user`
   - Click **Create**

### 5. Create Users

#### Regular User

1. Go to **Users** → **Create new user**
2. Fill in:
   - **Username**: `testuser`
   - **Email**: `testuser@example.com`
   - **Email verified**: ON (check this)
   - Click **Create**
3. Go to the **Credentials** tab
4. Set a password (e.g., `password123`)
   - **Temporary**: OFF (uncheck this)
   - Click **Save** 
5. Go to the **Role mapping** tab
6. Click **Assign role**
7. Leave the filter as **Filter by realm roles** (do NOT filter by clients)
8. Select **user** role from the realm roles list
9. Click **Assign**

#### Admin User

1. Repeat steps above but with:
   - **Username**: `admin`
   - **Email**: `admin@example.com`
   - **Password**: `admin123`
2. In the **Role mapping** tab:
   - Click **Assign role**
   - Leave filter as **Filter by realm roles**
   - Select **admin** role (instead of user role)
   - Click **Assign**

## Frontend Configuration

### Environment Variables

Create or update `.env` file in `XBI_UI/xbi-ui/`:

```env
REACT_APP_KEYCLOAK_URL=http://localhost:8080
REACT_APP_KEYCLOAK_REALM=xbi-tasking
REACT_APP_KEYCLOAK_CLIENT_ID=xbi-tasking-frontend
REACT_APP_DB_API_URL=http://localhost:5000
```

### Configuration File

The Keycloak configuration is in `XBI_UI/xbi-ui/src/keycloak.js`. Update the default values if needed:

```javascript
const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'xbi-tasking',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'xbi-tasking-frontend',
};
```

## Backend Configuration

### Environment Variables

Set the following environment variables before running the backend:

**Windows (PowerShell):**
```powershell
$env:KEYCLOAK_URL="http://localhost:8080"
$env:KEYCLOAK_REALM="xbi-tasking"
$env:KEYCLOAK_CLIENT_ID="xbi-tasking-backend"
$env:KEYCLOAK_CLIENT_SECRET="your-client-secret-here"
$env:KEYCLOAK_ENABLED="true"
```

**Linux/Mac:**
```bash
export KEYCLOAK_URL="http://localhost:8080"
export KEYCLOAK_REALM="xbi-tasking"
export KEYCLOAK_CLIENT_ID="xbi-tasking-backend"
export KEYCLOAK_CLIENT_SECRET="your-client-secret-here"
export KEYCLOAK_ENABLED="true"
```

**Or create a `.env` file** (if using python-dotenv):
```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=xbi-tasking
KEYCLOAK_CLIENT_ID=xbi-tasking-backend
KEYCLOAK_CLIENT_SECRET=your-client-secret-here
KEYCLOAK_ENABLED=true
```

### Enabling/Disabling Keycloak

To disable Keycloak authentication (for development/testing):
- Set `KEYCLOAK_ENABLED=false` or don't set it (defaults to false)
- The backend will accept requests without authentication

To enable Keycloak authentication:
- Set `KEYCLOAK_ENABLED=true`
- All protected endpoints will require valid Keycloak tokens

## Protected Endpoints

The following endpoints require authentication when `KEYCLOAK_ENABLED=true`:
- `/insertDSTAData` - Insert DSTA data
- `/insertTTGData` - Insert TTG data
- `/assignTask` - Assign tasks
- `/completeImages` - Complete images
- `/deleteImage` - Delete images

Other endpoints are currently unprotected but can be easily added by adding `user: dict = Depends(optional_auth)` to the route function.

## Testing the Integration

### 1. Start Keycloak Server

```bash
# Using Docker
docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:latest start-dev
```

### 2. Configure Keycloak (as described above)

### 3. Start Backend

```bash
cd xbi_tasking_backend/code/xbi_tasking_3
python main.py dev_server.config
```

### 4. Start Frontend

```bash
cd XBI_UI/xbi-ui
npm start
```

### 5. Test Login

1. Navigate to `http://localhost:3000`
2. You should see the Keycloak login page
3. Log in with a user created in Keycloak
4. You should be redirected back to the application

## Troubleshooting

### Frontend Issues

**"Keycloak initialization failed"**
- Check that Keycloak server is running
- Verify `REACT_APP_KEYCLOAK_URL` is correct
- Check browser console for detailed errors

**"Invalid redirect URI"**
- Ensure the redirect URI in Keycloak client settings matches your frontend URL
- Add `http://localhost:3000/*` to valid redirect URIs

### Backend Issues

**"Authentication failed"**
- Verify `KEYCLOAK_CLIENT_SECRET` is correct
- Check that `KEYCLOAK_URL` and `KEYCLOAK_REALM` are correct
- Ensure the backend client is configured as "confidential" in Keycloak

**"Token validation failed"**
- Check that tokens are being sent in the `Authorization: Bearer <token>` header
- Verify token hasn't expired (tokens auto-refresh in frontend)
- Check Keycloak server logs for errors

### Common Configuration Mistakes

1. **Mismatched realm names**: Ensure frontend and backend use the same realm
2. **Wrong client IDs**: Frontend and backend should use different clients
3. **Missing client secret**: Backend client must be "confidential" and have a secret
4. **CORS issues**: Ensure Keycloak allows your frontend origin

## Migration from Old Authentication

The old `/accountLogin` endpoint is still available but deprecated. To fully migrate:

1. Set up Keycloak as described above
2. Enable Keycloak: `KEYCLOAK_ENABLED=true`
3. Update all users in Keycloak
4. Remove the old `/accountLogin` endpoint (optional)

## Security Considerations

1. **Never commit secrets**: Use environment variables or secrets management
2. **Use HTTPS in production**: Keycloak and your application should use HTTPS
3. **Token expiration**: Tokens automatically refresh, but ensure proper session management
4. **Client secrets**: Keep backend client secrets secure
5. **CORS**: Configure CORS properly for production

## Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak JavaScript Adapter](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)


