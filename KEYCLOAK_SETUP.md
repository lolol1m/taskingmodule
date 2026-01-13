# Keycloak Setup

## Keycloak Configuration

### 1. Create/Update Realm

1. Go to Keycloak Admin Console: http://localhost:8080/admin
2. Select or create realm: `xbi-tasking`
3. Click **Create** (if new) or select existing realm

### 2. Configure Backend Client

**This is the REQUIRED client for authentication.**

1. Go to **Clients** → **Create client** (or edit existing `xbi-tasking-backend`)
2. Fill in:
   - **Client type**: OpenID Connect
   - **Client ID**: `xbi-tasking-backend`
   - Click **Next**
3. In **Capability config**:
   - **Enable Client authentication** (makes it confidential)
   - **Enable Standard flow** (Authorization Code Flow) - **REQUIRED**
   - **Disable Direct access grants** (using redirect flow, not ROPC)
   - Click **Next**
4. In **Login settings**:
   - **Root URL**: Leave empty
   - **Home URL**: Leave empty
   - **Valid redirect URIs**: 
     ```
     http://localhost:5000/auth/callback
     ```
   - **Valid post logout redirect URIs**:
     ```
     http://localhost:3000/*
     ```
   - **Web origins**: 
     ```
     http://localhost:5000
     ```
   - Click **Save**
5. Go to **Credentials** tab
6. Copy the **Client secret** - you'll need this for backend config

### 3. Create Realm Roles

1. Go to **Realm roles**
2. Create roles:
   - `II`
   - `Senior II`
   - `IA`

### 4. Create Users

1. Go to **Users** → **Create new user**
2. Set username, email (optional)
3. Go to **Credentials** tab → Set password
4. Go to **Role mapping** tab → Assign appropriate realm role (II, Senior II, or IA)

### 5. (Optional) Configure Admin Client for User Listing

**Note**: This client is OPTIONAL. It's only needed if you want the `/getUsers` endpoint to query Keycloak for users with specific roles. The application will work fine without it - the endpoint will just return users from the database instead.

If you don't need Keycloak user listing, you can skip this section and leave `admin_client_secret` as `your_admin_client_secret` in the config file.

1. Go to **Clients** → **Create client**
2. Fill in:
   - **Client type**: OpenID Connect
   - **Client ID**: `xbi-tasking-admin`
   - Click **Next**
3. In **Capability config**:
   - **Enable Client authentication** (makes it confidential)
   - **Disable Standard flow** (not needed for service account)
   - **Enable Service accounts roles** (required for admin API access)
   - Click **Next**
4. In **Login settings**:
   - **Valid redirect URIs**: Leave empty
   - Click **Save**
5. Go to **Credentials** tab
6. Copy the **Client secret** - you'll need this for backend config
7. Go to **Service accounts roles** tab
8. Click **Assign role** → **Filter by clients** → Select `realm-management`
9. Assign these roles:
   - `view-users` (to view users)
   - `query-users` (to query users by role)
   - `view-realm` (to access realm info)

## Backend Configuration

### Environment Variables

Set in `dev_server.config` or as environment variables:

```ini
[Keycloak]
keycloak_url: http://localhost:8080
realm: xbi-tasking
client_id: xbi-tasking-backend
client_secret: <your-client-secret-from-keycloak>
# Optional: Only needed if you want /getUsers endpoint to query Keycloak
admin_client_id: xbi-tasking-admin
admin_client_secret: <your-admin-client-secret>  # Leave as 'your_admin_client_secret' if not using admin client
```

Or set environment variable:
```powershell
$env:FRONTEND_URL="http://localhost:3000"
```

## Frontend Configuration

### Environment Variables

Create `.env` file in `xbi-ui/`:

```env
REACT_APP_DB_API_URL=http://localhost:5000
```

**Note**: Frontend does NOT need Keycloak URL, realm, or client ID - it never talks to Keycloak directly.

## How Authentication Works

### Frontend Authentication

1. **On page load**: `AuthGuard.js` checks for `access_token` in localStorage
2. **If no token**: Redirects to `http://localhost:5000/auth/login`
3. **After redirect**: Extracts tokens from URL fragment (`#access_token=...`)
4. **Stores tokens**: Saves to localStorage
5. **API calls**: Automatically includes `Authorization: Bearer <token>` header via axios interceptor

### Backend Authentication

1. **Token validation**: Middleware validates every request (except `/auth/*` endpoints)
2. **Token introspection**: Backend calls Keycloak to verify token is valid
3. **User info**: Extracts user roles and account type from token
4. **Protected routes**: Require valid token or return 401

### Token Flow

- **Access Token**: Short-lived (typically 5 minutes), used for API calls
- **Refresh Token**: Long-lived, used to get new access tokens (not yet implemented)
- **Storage**: Tokens stored in browser localStorage
- **Security**: Tokens sent in HTTP headers, never in URL query params (except during redirect)

## Testing the Flow

1. **Start Keycloak**: Run `start_keycloak.bat` or manually start Keycloak
2. **Start Backend**: Run `start_backend.bat`
3. **Start Frontend**: Run `npm start` in `xbi-ui/`
4. **Visit**: http://localhost:3000
5. **Expected**: 
   - Redirects to Keycloak login
   - After login, redirects back to frontend
   - Frontend shows main application

## Troubleshooting

### "Invalid redirect URI" error
- Check that `http://localhost:5000/auth/callback` is in Keycloak client's "Valid redirect URIs"
- Make sure there are no trailing slashes

### "Client authentication failed"
- Verify client secret matches in `dev_server.config`
- Check that client is set to "confidential" (Client authentication enabled)

### "Token validation failed"
- Check that backend can reach Keycloak
- Verify `KEYCLOAK_URL` and `KEYCLOAK_REALM` are correct
- Check token hasn't expired

### "401 Client Error: Unauthorized" when calling `/getUsers`
- This is expected if the admin client is not configured
- The endpoint will return users from the database only
- To enable Keycloak user listing, configure the admin client (see section 5)
- If you see this error but don't need Keycloak user listing, you can ignore it

### Frontend stuck in redirect loop
- Clear localStorage: `localStorage.clear()` in browser console
- Check browser console for errors
- Verify backend is running and `/auth/login` endpoint is accessible

## Security Notes

1. **Tokens in URL fragment**: More secure than query params (fragments aren't sent to server)
2. **HTTPS in production**: Always use HTTPS in production
3. **Token expiration**: Implement refresh token logic for long sessions
4. **CSRF protection**: State parameter in redirect flow provides CSRF protection
5. **HttpOnly cookies**: State stored in HttpOnly cookie (can't be accessed by JavaScript)

## Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak JavaScript Adapter](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

