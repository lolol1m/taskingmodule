# Keycloak User Migration Guide

This guide explains how to migrate existing database users to Keycloak and integrate role-based access control.

## Overview

The system currently has:
- **Database accounts**: `accounts` table with account types (II, Senior II, IA) and password hashes
- **Database users**: `users` table with user names (II User, Senior II User, IA User)
- **Old authentication**: Password-based login using `accountLogin` endpoint

After migration:
- **Keycloak users**: Users created in Keycloak with usernames matching account types
- **Keycloak roles**: Realm roles (II, Senior II, IA) assigned to users
- **New authentication**: Keycloak-based login with role detection from JWT tokens

## Prerequisites

1. Keycloak server running and accessible
2. Realm `xbi-tasking` created in Keycloak
3. Realm roles created: `II`, `Senior II`, `IA`
4. Python dependencies installed: `python-keycloak`

## Step 1: Create Realm Roles in Keycloak

Before running the migration, create the roles in Keycloak:

1. Go to Keycloak Admin Console: http://localhost:8080/admin
2. Select realm: `xbi-tasking`
3. Go to: **Realm roles** → **Create role**
4. Create three roles:
   - Role name: `II`
   - Role name: `Senior II`
   - Role name: `IA`
5. Click **Save** for each role

## Step 2: Run Migration Script

The migration script will:
- Read users from the database (`users` table)
- Create corresponding users in Keycloak
- Assign appropriate roles based on account type
- Set passwords (from the original account passwords)

### Run the script:

```bash
cd xbi_tasking_backend/code/xbi_tasking_3
python migrate_users_to_keycloak.py
```

### Environment Variables (optional):

```bash
set KEYCLOAK_URL=http://localhost:8080
set KEYCLOAK_REALM=xbi-tasking
set KEYCLOAK_ADMIN_USER=admin
set KEYCLOAK_ADMIN_PASSWORD=admin
```

### Expected Output:

```
Starting user migration to Keycloak...
✅ Connected to Keycloak admin
✅ Switched to realm: xbi-tasking

Found 3 users in database

Processing user: II User
  ✅ Created user: ii (ID: ...)
  ✅ Set password for user
  ✅ Assigned role 'II'

Processing user: Senior II User
  ✅ Created user: senior_ii (ID: ...)
  ✅ Set password for user
  ✅ Assigned role 'Senior II'

Processing user: IA User
  ✅ Created user: ia (ID: ...)
  ✅ Set password for user
  ✅ Assigned role 'IA'

✅ Migration complete!
```

## Step 3: Verify Users in Keycloak

1. Go to Keycloak Admin Console
2. Select realm: `xbi-tasking`
3. Go to: **Users**
4. Verify three users exist:
   - `ii` (with role: II)
   - `senior_ii` (with role: Senior II)
   - `ia` (with role: IA)

## Step 4: Test Login

Test login with the migrated users:

| Username | Password | Role |
|----------|----------|------|
| `ii` | `1` | II |
| `senior_ii` | `2` | Senior II |
| `ia` | `3` | IA |

## Step 5: Code Changes

The following files have been updated to use Keycloak roles:

### Frontend Changes:

1. **`useKeycloakRole.js`** (NEW): Hook to extract role from Keycloak token
2. **`AdminPage.js`**: Updated to use `useKeycloakRole()` instead of `tokenString`
3. **`TaskingManager.js`**: Updated to use `useKeycloakRole()` instead of `tokenString`
4. **`TaskingSummary.js`**: Updated to use `useKeycloakRole()` instead of `tokenString`

### Backend Changes:

1. **`KeycloakAuth.py`**: Updated to extract `account_type` from token roles
   - Returns `account_type` field in user info (for backward compatibility)
   - Returns `roles` array with all realm roles

## Role Hierarchy and Permissions

The system uses the following role hierarchy:

1. **IA** (Image Analyst): Highest permissions
   - Can access Admin Page
   - Can view all tabs in Tasking Summary
   - Can assign tasks

2. **Senior II** (Senior Image Interpreter): Medium permissions
   - Cannot access Admin Page
   - Can view all tabs in Tasking Summary
   - Can assign tasks

3. **II** (Image Interpreter): Basic permissions
   - Cannot access Admin Page
   - Can only view "Current Tasks" tab in Tasking Summary
   - Can assign tasks

## Database Changes

The `accounts` table is no longer used for authentication but can be kept for reference.

The `users` table is still used for:
- Task assignment (assignee_id references users.id)
- User dropdown lists in the UI

**Note**: The `users` table should be kept in sync with Keycloak users. You may want to:
- Create a sync script to update the `users` table when new users are added to Keycloak
- Or use Keycloak user IDs directly in the database (requires schema changes)

## Troubleshooting

### Migration script fails to connect:

- Verify Keycloak is running: http://localhost:8080
- Check admin credentials (default: admin/admin)
- Verify the realm `xbi-tasking` exists

### Roles not assigned:

- Verify roles exist in Keycloak: Realm roles → Check for II, Senior II, IA
- Check script output for role assignment errors

### Frontend shows wrong role:

- Clear browser storage: `localStorage.clear(); sessionStorage.clear();`
- Verify user has correct role assigned in Keycloak
- Check browser console for Keycloak token parsing errors

### Backend authentication fails:

- Verify `KEYCLOAK_CLIENT_SECRET` is set correctly
- Check backend logs for token validation errors
- Verify backend client is configured as "confidential" in Keycloak

## Next Steps

1. **Update passwords**: After migration, users should change their passwords in Keycloak
2. **Add more users**: Create additional users in Keycloak and assign appropriate roles
3. **Remove old login**: Once fully migrated, you can remove the old `accountLogin` endpoint
4. **Sync users table**: Consider creating a sync mechanism between Keycloak users and the database `users` table

## Security Notes

- Passwords in the migration script are plaintext (1, 2, 3) - users should change them immediately
- The old `accounts` table with password hashes can be removed after migration
- Consider implementing password policies in Keycloak
- Enable MFA for production environments




