# Keycloak Integration - Summary of Changes

## Overview
Refactored the application to use Keycloak as the **single source of truth** for user management and authentication. This eliminates duplicate user data management and centralizes authentication/authorization.

## Key Architectural Decisions

### 1. Keycloak as Single Source of Truth

**Why:**
- **Centralized User Management**: All user accounts, passwords, and roles are managed in one place (Keycloak)
- **Security Best Practice**: Eliminates the need to store passwords in our database
- **Simplified Administration**: User creation, updates, and role assignments happen in Keycloak only
- **Consistency**: No risk of user data getting out of sync between our database and Keycloak

**What Changed:**
- Removed dependency on local `users` table for authentication
- All user lookups now reference Keycloak user IDs (UUIDs)
- Database now stores Keycloak user IDs as foreign keys instead of local user IDs

### 2. Using Keycloak User IDs (UUIDs) Instead of Usernames

**Why:**
- **Stability**: Keycloak user IDs (UUIDs) never change, even if usernames are updated
- **Uniqueness**: UUIDs are globally unique, preventing conflicts
- **Reliability**: Usernames can be changed in Keycloak, but IDs remain constant
- **Direct Reference**: Direct mapping to Keycloak user records without lookup overhead

**Implementation:**
- Database tables (`task`, `image`) now store `assignee_keycloak_id` and `vetter_keycloak_id` (VARCHAR containing UUIDs)
- Frontend sends Keycloak user IDs when assigning tasks
- Backend validates and uses these IDs directly

### 3. Minimal `user_cache` Table

**Why:**
- Keycloak doesn't store application-specific state (like `is_present` flag)
- We need a lightweight cache for application-specific user attributes

**What It Stores:**
- `keycloak_user_id` (VARCHAR) - References Keycloak user
- `is_present` (BOOLEAN) - Application-specific flag for filtering available users

**What It Doesn't Store:**
- Usernames (fetched from Keycloak on-demand)
- Passwords (never stored)
- Roles (managed in Keycloak)

## Technical Implementation

### Database Schema Changes
1. **Removed**: Dependency on local `users` table
2. **Added**: `user_cache` table for application-specific state
3. **Modified**: `task` and `image` tables to use `*_keycloak_id` columns

### Authentication Flow
1. User logs in via Keycloak (frontend redirects to Keycloak login)
2. Backend exchanges authorization code for tokens
3. Backend validates JWT tokens on every request
4. User information is extracted from JWT token claims

### User Lookup Process
1. Frontend requests user list for dropdowns
2. Backend queries Keycloak Admin API for users with specific roles (II, Senior II, IA)
3. Backend filters by `is_present = True` from `user_cache`
4. Returns list of `{id: keycloak_user_id, name: username}` objects

## Benefits

1. **Security**: No password storage in our database
2. **Maintainability**: Single place to manage users
3. **Scalability**: Easy to add new applications using same Keycloak realm
4. **Compliance**: Centralized authentication makes auditing easier
5. **Flexibility**: Can add SSO, MFA, and other enterprise features through Keycloak

## Migration Notes

- Existing database records were migrated to use Keycloak user IDs
- `user_cache` table populated with existing users and their `is_present` status
- Backward compatibility maintained during transition period

## Files Modified

- `xbi_tasking_backend/main_classes/Database.py` - Schema updates
- `xbi_tasking_backend/main_classes/QueryManager.py` - Keycloak user lookups
- `xbi_tasking_backend/main_classes/MainController.py` - User ID handling
- `xbi-ui/src/pages/TaskingManager.js` - Keycloak user ID handling in frontend
- Authentication middleware and endpoints

