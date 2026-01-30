import logging
import requests
import main_classes.EnumClasses as EnumClasses
from services.keycloak_service import KeycloakService


logger = logging.getLogger("xbi_tasking_backend.query_keycloak")


class KeycloakQueries:
    def __init__(self, db, keycloak_user_cache, keycloak_service=None):
        self.db = db
        self._keycloak_user_cache = keycloak_user_cache
        self.kc = keycloak_service or KeycloakService()

    def get_keycloak_username(self, keycloak_user_id):
        if not keycloak_user_id:
            return 'Unassigned'
        if keycloak_user_id in self._keycloak_user_cache:
            return self._keycloak_user_cache[keycloak_user_id]
        try:
            token = self.get_keycloak_admin_token()
            user_data = self.kc.get_user_by_id(token, keycloak_user_id)
            username = user_data.get("username", keycloak_user_id)
            self._keycloak_user_cache[keycloak_user_id] = username
            return username
        except (ValueError, requests.exceptions.RequestException) as e:
            logger.warning("Could not resolve Keycloak user %s: %s", keycloak_user_id, e)
        return keycloak_user_id

    def get_keycloak_usernames_bulk(self, keycloak_user_ids):
        ids = [user_id for user_id in set(keycloak_user_ids or []) if user_id]
        if not ids:
            return {}

        resolved = {
            user_id: username
            for user_id, username in self._keycloak_user_cache.items()
            if user_id in ids
        }
        missing = [user_id for user_id in ids if user_id not in resolved]
        if not missing:
            return resolved

        try:
            token = self.get_keycloak_admin_token()
        except (ValueError, requests.exceptions.RequestException) as e:
            logger.warning("Could not get Keycloak admin token for bulk lookup: %s", e)
            return resolved

        role_enum = EnumClasses.Role
        role_names = [role_enum.II.value, role_enum.SENIOR_II.value, role_enum.IA.value]
        id_to_username = {}
        for role_name in role_names:
            try:
                users = self.kc.get_users_for_role(token, role_name)
                for user in users:
                    user_id = user.get("id")
                    username = user.get("username")
                    if user_id and username:
                        id_to_username[user_id] = username
            except requests.exceptions.RequestException as e:
                logger.warning("Could not fetch users for role %s: %s", role_name, e)
                continue

        for user_id in missing:
            username = id_to_username.get(user_id)
            if username:
                resolved[user_id] = username
                self._keycloak_user_cache[user_id] = username

        still_missing = [user_id for user_id in missing if user_id not in resolved]
        for user_id in still_missing:
            try:
                user_data = self.kc.get_user_by_id(token, user_id)
                username = user_data.get("username", user_id)
                resolved[user_id] = username
                self._keycloak_user_cache[user_id] = username
            except requests.exceptions.RequestException as e:
                logger.warning("Could not resolve Keycloak user %s: %s", user_id, e)

        return resolved
    
    def map_keycloak_username_to_db_username(self, keycloak_username):
        '''
        Helper function to map Keycloak usernames to database usernames
        Input: Keycloak username (e.g., "iiuser", "iisenior", "iauser")
        Output: Database username (e.g., "II User", "Senior II User", "IA User")
        '''
        username_mapping = {
            'iiuser': 'II User',
            'iisenior': 'Senior II User',
            'iauser': 'IA User'
        }
        # Try to map the username, fallback to original if no mapping exists
        return username_mapping.get(keycloak_username.lower(), keycloak_username)
    
    def map_keycloak_username_to_keycloak_id(self, keycloak_username):
        token = self.get_keycloak_admin_token()
        return self.kc.find_user_id(token, keycloak_username)

    def _get_keycloak_role(self, role_name):
        token = self.get_keycloak_admin_token()
        return self.kc.get_role(token, role_name)

    def _assign_realm_role(self, user_id, role_representation):
        token = self.get_keycloak_admin_token()
        self.kc.assign_realm_role(token, user_id, role_representation)

    def createKeycloakUser(self, username, password, role_name):
        # Check for existing user
        token = self.get_keycloak_admin_token()
        existing = self.kc.find_user_id(token, username)
        if existing:
            raise ValueError("Username already exists")

        # Create user
        user_id = self.kc.create_user(token, username, password)
        if not user_id:
            user_id = self.kc.find_user_id(token, username)
        if not user_id:
            raise ValueError("User creation failed")

        # Assign role
        role_rep = self._get_keycloak_role(role_name)
        self._assign_realm_role(user_id, role_rep)

        # Ensure user exists in cache (default to not present)
        query = """
            INSERT INTO user_cache (keycloak_user_id, is_present)
            VALUES (%s, FALSE)
            ON CONFLICT (keycloak_user_id) DO NOTHING
        """
        self.db.executeInsert(query, (user_id,))
        return {"id": user_id, "username": username, "role": role_name}

    def get_keycloak_admin_token(self):
        '''
        Obtain Keycloak admin token of xbi-tasking-admin client
        Input: NIL
        Output: Admin client token
        '''
        return self.kc.get_admin_token()

    def getKeycloakUserID(self, assignee_username):
        '''
        Function:   Gets the Keycloak user ID for the given username
        Input:      Assignee username (Keycloak username)
        Output:     Keycloak user ID (sub) or None if not found
        Note:       Queries Keycloak Admin API to get user ID by username
        '''
        try:
            token = self.get_keycloak_admin_token()
        except (ValueError, requests.exceptions.RequestException) as e:
            logger.warning("Could not get Keycloak admin token: %s", e)
            return None
        
        try:
            return self.kc.find_user_id(token, assignee_username)
        except requests.exceptions.RequestException as e:
            logger.warning("Could not fetch user from Keycloak: %s", e)
            return None

    def syncUserCache(self, keycloak_user_id, display_name=None):
        '''
        Function:   Ensures user exists in cache (for is_present state management)
        Input:      keycloak_user_id (sub), display_name (ignored - Keycloak is source of truth)
        Output:     NIL
        Note:       We only store keycloak_user_id and is_present - display names come from Keycloak
        '''
        # Just ensure user exists in cache - we don't store display_name
        query = """
            INSERT INTO user_cache (keycloak_user_id, is_present)
            VALUES (%s, FALSE)
            ON CONFLICT (keycloak_user_id) DO NOTHING
        """
        self.db.executeInsert(query, (keycloak_user_id,))

    def getUsers(self):
        '''
        Function:   Gets users from Keycloak (II, Senior II, IA roles) with presence from cache
        Input:      None
        Output:     list of dicts with id, name, role, is_present
        Note:       Keycloak is the source of truth for users/roles; cache stores is_present
        '''
        try:
            token = self.get_keycloak_admin_token()
        except (ValueError, requests.exceptions.RequestException) as e:
            logger.warning("Could not get Keycloak admin token: %s", e)
            return []

        role_enum = EnumClasses.Role
        role_names = [role_enum.II.value, role_enum.SENIOR_II.value, role_enum.IA.value]
        user_map = {}

        for role_name in role_names:
            try:
                users = self.kc.get_users_for_role(token, role_name)
                for user in users:
                    username = user.get("username")
                    user_id = user.get("id")
                    if not username or not user_id:
                        continue
                    entry = user_map.setdefault(username, {"id": user_id, "roles": set()})
                    entry["roles"].add(role_name)
            except requests.exceptions.RequestException as e:
                logger.warning("Could not fetch users with role %s from Keycloak: %s", role_name, e)
                continue

        if not user_map:
            return []

        query = """
            INSERT INTO user_cache (keycloak_user_id, is_present)
            VALUES (%s, FALSE)
            ON CONFLICT (keycloak_user_id) DO NOTHING
        """
        user_id_tuples = [(entry["id"],) for entry in user_map.values()]
        self.db.executeInsertMany(query, user_id_tuples)

        # Fetch presence for all users
        user_ids = [entry["id"] for entry in user_map.values()]
        placeholders = ','.join(['%s'] * len(user_ids))
        query = f"""
            SELECT keycloak_user_id, is_present, last_updated
            FROM user_cache
            WHERE keycloak_user_id IN ({placeholders})
        """
        result = self.db.executeSelect(query, tuple(user_ids))
        presence_map = {row[0]: {"is_present": row[1], "last_updated": row[2]} for row in result}

        output = []
        for username, entry in user_map.items():
            roles_for_user = sorted(entry["roles"])
            presence = presence_map.get(entry["id"], {})
            last_updated = presence.get("last_updated")
            if last_updated is not None:
                last_updated = last_updated.isoformat()
            output.append({
                "id": entry["id"],
                "name": username,
                "role": ", ".join(roles_for_user) if roles_for_user else None,
                "is_present": bool(presence.get("is_present", False)),
                "last_updated": last_updated,
            })

        output.sort(key=lambda item: item["name"].lower())
        return output

    def getUserIds(self):
        '''
        Function:   Gets Keycloak user IDs for users with II role who are present
        Input:      None
        Output:     Set of Keycloak user IDs
        '''
        try:
            token = self.get_keycloak_admin_token()
        except (ValueError, requests.exceptions.RequestException):
            return set()

        # Get Keycloak user IDs for II role
        try:
            users = self.kc.get_users_for_role(token, EnumClasses.Role.II.value)
            keycloak_ids = {user.get("id") for user in users if user.get("id")}
        except requests.exceptions.RequestException:
            return set()
        
        # Filter by is_present from cache
        if keycloak_ids:
            placeholders = ','.join(['%s'] * len(keycloak_ids))
            query = f"""
                SELECT keycloak_user_id 
                FROM user_cache 
                WHERE keycloak_user_id IN ({placeholders}) 
                AND is_present = True
            """
            result = self.db.executeSelect(query, tuple(keycloak_ids))
            return set(row[0] for row in result)
        
        return set()

    def resetRecentUsers(self):
        '''
        Function: Resets the isRecent flag on all users
        Input: NIL
        Output: NIL
        '''
        query = "UPDATE user_cache SET is_present = False, last_updated = NOW()"
        self.db.executeUpdate(query)

    #TODO: figure out how the new user add system is going to work and change this accordingly
    def addUsers(self, user_list):
        '''
        Function: Adds unique new users to the database cache (for is_present state)
        Input: List of (keycloak_user_id,) tuples
        Output: NIL
        Note: Keycloak is source of truth - we only store is_present state here
        '''
        user_id_tuples = []
        for username in user_list:
            user_id = self.map_keycloak_username_to_keycloak_id(username)
            if not user_id:
                logger.warning("%s not in Keycloak. Ensure account exists in Keycloak", username)
                continue
            user_id_tuples.append((user_id,))
            
        query = """
            INSERT INTO user_cache (keycloak_user_id, is_present, last_updated)
            VALUES (%s, FALSE, NOW())
            ON CONFLICT (keycloak_user_id) DO NOTHING
        """
        self.db.executeInsertMany(query, user_id_tuples)
    
    #TODO: figure out how the new user add system is going to work and change this accordingly
    def updateExistingUsers(self, user_list):
        '''
        Function: Updates existing users isRecent flag
        Input: List of users
        Output: NIL
        '''
        user_id_tuples = []
        for username in user_list:
            user_id = self.map_keycloak_username_to_keycloak_id(username)
            if not user_id:
                logger.warning("%s not in Keycloak. Ensure account exists in Keycloak", username)
                continue
            user_id_tuples.append((user_id,))

        query = "UPDATE user_cache SET is_present = True WHERE keycloak_user_id = %s"
        self.db.executeUpdateMany(query, user_id_tuples)
