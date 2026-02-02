import re


class KeycloakTestAdapter:
    def __init__(self):
        self.user_id_to_name = {}
        self.user_id_to_kc = {}
        self.kc_to_user_id = {}
        self.kc_to_name = {}
        self.name_to_kc = {}
        self.user_presence = {}

        self._orig_executeInsert = None
        self._orig_executeInsertMany = None
        self._orig_executeSelect = None

        self._orig_kc_get_user_id = None
        self._orig_kc_get_username = None
        self._orig_kc_get_usernames_bulk = None
        self._orig_kc_get_users = None
        self._orig_kc_get_user_ids = None

    def register_user(self, user_id: int, name: str, is_present=None):
        kc_id = f"kc-{name}"
        self.user_id_to_name[user_id] = name
        self.user_id_to_kc[user_id] = kc_id
        self.kc_to_user_id[kc_id] = user_id
        self.kc_to_name[kc_id] = name
        self.name_to_kc[name] = kc_id
        if is_present is not None:
            self.user_presence[kc_id] = bool(is_present)
        return kc_id

    def _parse_user_insert(self, query: str):
        with_presence = re.search(
            r"VALUES\s*\(\s*(\d+)\s*,\s*'([^']+)'\s*,\s*(True|False)\s*\)",
            query,
        )
        if with_presence:
            user_id = int(with_presence.group(1))
            name = with_presence.group(2)
            is_present = with_presence.group(3) == "True"
            self.register_user(user_id, name, is_present=is_present)
            return True

        without_presence = re.search(
            r"VALUES\s*\(\s*(\d+)\s*,\s*'([^']+)'\s*\)",
            query,
        )
        if without_presence:
            user_id = int(without_presence.group(1))
            name = without_presence.group(2)
            self.register_user(user_id, name)
            return True

        return False

    def patch_db(self, db):
        self._orig_executeInsert = db.executeInsert
        self._orig_executeInsertMany = db.executeInsertMany
        self._orig_executeSelect = db.executeSelect

        def _executeInsert(query, values=None):
            if "INSERT INTO users" in query:
                if self._parse_user_insert(query):
                    return 0
            if "assignee_id" in query:
                query = query.replace("assignee_id", "assignee_keycloak_id")
                match = re.search(r"VALUES\s*\(\s*(\d+)\s*,", query)
                if match:
                    user_id = int(match.group(1))
                    name = self.user_id_to_name.get(user_id, f"user_{user_id}")
                    kc_id = self.name_to_kc.get(name, f"kc-{name}")
                    self.name_to_kc.setdefault(name, kc_id)
                    self.kc_to_name.setdefault(kc_id, name)
                    self.kc_to_user_id.setdefault(kc_id, user_id)
                    query = re.sub(r"VALUES\s*\(\s*\d+\s*,", f"VALUES ('{kc_id}',", query, count=1)
            return self._orig_executeInsert(query, values)

        def _executeInsertMany(query, values=None):
            return self._orig_executeInsertMany(query, values)

        def _executeSelect(query, values=None):
            if "FROM users" in query:
                return []
            if "assignee_id" in query:
                query = query.replace("assignee_id", "assignee_keycloak_id")
                results = self._orig_executeSelect(query, values)
                remapped = []
                for row in results:
                    kc_id = row[0]
                    user_id = self.kc_to_user_id.get(kc_id)
                    remapped.append((user_id,) + row[1:])
                return remapped
            return self._orig_executeSelect(query, values)

        db.executeInsert = _executeInsert
        db.executeInsertMany = _executeInsertMany
        db.executeSelect = _executeSelect

    def patch_keycloak(self, qm):
        self._orig_kc_get_user_id = qm._keycloak.getKeycloakUserID
        self._orig_kc_get_username = qm._keycloak.get_keycloak_username
        self._orig_kc_get_usernames_bulk = qm._keycloak.get_keycloak_usernames_bulk
        self._orig_kc_get_users = qm._keycloak.getUsers
        self._orig_kc_get_user_ids = qm._keycloak.getUserIds

        def _kc_get_user_id(username):
            return self.name_to_kc.get(username)

        def _kc_get_username(keycloak_user_id):
            return self.kc_to_name.get(keycloak_user_id, keycloak_user_id)

        def _kc_get_usernames_bulk(keycloak_user_ids):
            return {user_id: self.kc_to_name.get(user_id, user_id) for user_id in keycloak_user_ids}

        def _kc_get_users():
            users = []
            for kc_id, name in self.kc_to_name.items():
                users.append(
                    {
                        "id": kc_id,
                        "name": name,
                        "role": "II",
                        "is_present": bool(self.user_presence.get(kc_id, False)),
                    }
                )
            users.sort(key=lambda item: item["name"].lower())
            return users

        qm._keycloak.getKeycloakUserID = _kc_get_user_id
        qm._keycloak.get_keycloak_username = _kc_get_username
        qm._keycloak.get_keycloak_usernames_bulk = _kc_get_usernames_bulk
        qm._keycloak.getUsers = _kc_get_users
        qm._keycloak.getUserIds = lambda: set(self.kc_to_name.keys())

    def restore_db(self, db):
        db.executeInsert = self._orig_executeInsert
        db.executeInsertMany = self._orig_executeInsertMany
        db.executeSelect = self._orig_executeSelect

    def restore_keycloak(self, qm):
        qm._keycloak.getKeycloakUserID = self._orig_kc_get_user_id
        qm._keycloak.get_keycloak_username = self._orig_kc_get_username
        qm._keycloak.get_keycloak_usernames_bulk = self._orig_kc_get_usernames_bulk
        qm._keycloak.getUsers = self._orig_kc_get_users
        qm._keycloak.getUserIds = self._orig_kc_get_user_ids
