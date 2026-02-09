import unittest

from config import get_config, load_config
from main_classes.Database import Database
from main_classes.query_images import ImageQueries
from main_classes.query_keycloak import KeycloakQueries
from main_classes.query_tasking import TaskingQueries


class FakeKeycloakService:
    def __init__(self, role_users):
        self.role_users = role_users

    def get_admin_token(self):
        return "test-token"

    def get_users_for_role(self, token, role_name):
        return self.role_users.get(role_name, [])

    def find_user_id(self, token, username):
        for users in self.role_users.values():
            for user in users:
                if user.get("username") == username:
                    return user.get("id")
        return None


class StubKeycloakQueries:
    def __init__(self, name_map=None):
        self.name_map = name_map or {}

    def get_keycloak_usernames_bulk(self, keycloak_user_ids):
        return {user_id: self.name_map.get(user_id, user_id) for user_id in keycloak_user_ids}

    def get_keycloak_username(self, keycloak_user_id):
        if not keycloak_user_id:
            return None
        return self.name_map.get(keycloak_user_id, keycloak_user_id)

    def getUserIds(self):
        return set(self.name_map.keys())


class SqlIntegration_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        config = load_config("testing.config")
        self.db = Database(config=config)
        if get_config().getDatabaseName() != "XBI_TASKING_3_TEST":
            print("PLS CHECK YOUR config file")
            exit()
        else:
            self.tearDownClass()

        role_users = {
            "II": [{"id": "kc-ii-1", "username": "iiuser"}],
            "Senior II": [{"id": "kc-senior-1", "username": "iisenior"}],
            "IA": [{"id": "kc-ia-1", "username": "iauser"}],
        }
        self.kc_queries = KeycloakQueries(
            self.db,
            keycloak_user_cache={},
            keycloak_service=FakeKeycloakService(role_users),
        )
        self.tasking = TaskingQueries(self.db, StubKeycloakQueries({"kc-user-1": "user1"}))
        self.images = ImageQueries(self.db, StubKeycloakQueries({"kc-user-1": "user1"}))

    @classmethod
    def tearDownClass(self):
        self.db.deleteAll()

    def setUp(self):
        self.db.deleteAll()
        self.db.seed_test_data()

    def _insert_image_with_area(self, image_id, area_name):
        self.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB') ON CONFLICT (id) DO NOTHING")
        self.db.executeInsert(
            "INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) "
            "VALUES (1, 'hello.png', %s, %s, %s, 1, 1, 1, 'good', 1, 1)",
            (image_id, "2023-02-07 11:44:10.973005", "2023-02-07 11:44:10.973005"),
        )
        scvu_image_id = self.db.executeSelect("SELECT scvu_image_id FROM image WHERE image_id = %s", (image_id,))[0][0]
        self.db.executeInsert(
            "INSERT INTO area(area_name) VALUES (%s) ON CONFLICT (area_name) DO NOTHING",
            (area_name,),
        )
        scvu_area_id = self.db.executeSelect("SELECT scvu_area_id FROM area WHERE area_name = %s", (area_name,))[0][0]
        self.db.executeInsert(
            "INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)",
            (scvu_image_id, scvu_area_id),
        )
        image_area_id = self.db.executeSelect(
            "SELECT scvu_image_area_id FROM image_area WHERE scvu_image_id = %s AND scvu_area_id = %s",
            (scvu_image_id, scvu_area_id),
        )[0][0]
        return scvu_image_id, image_area_id

    def test_get_active_task_counts_for_users(self):
        _, image_area_id = self._insert_image_with_area(1, "area-1")
        _, image_area_id2 = self._insert_image_with_area(2, "area-2")

        self.db.executeInsert(
            "INSERT INTO task(assignee_keycloak_id, task_status_id, scvu_image_area_id) VALUES (%s, %s, %s)",
            ("kc-user-1", 1, image_area_id),
        )
        self.db.executeInsert(
            "INSERT INTO task(assignee_keycloak_id, task_status_id, scvu_image_area_id) VALUES (%s, %s, %s)",
            ("kc-user-1", 4, image_area_id2),
        )

        _, image_area_id3 = self._insert_image_with_area(3, "area-3")
        self.db.executeInsert(
            "INSERT INTO task(assignee_keycloak_id, task_status_id, scvu_image_area_id) VALUES (%s, %s, %s)",
            ("kc-user-2", 1, image_area_id3),
        )

        counts = self.tasking.getActiveTaskCountsForUsers(["kc-user-1", "kc-user-2", "kc-user-3"])
        self.assertEqual(counts["kc-user-1"], 1, "active task count should exclude completed")
        self.assertEqual(counts["kc-user-2"], 1, "active task count should include incomplete")
        self.assertEqual(counts["kc-user-3"], 0, "missing users should default to 0")

    def test_tasking_summary_area_data_for_images_in_clause(self):
        scvu_image_id1, image_area_id1 = self._insert_image_with_area(10, "area-a")
        scvu_image_id2, image_area_id2 = self._insert_image_with_area(20, "area-b")
        scvu_image_id3, image_area_id3 = self._insert_image_with_area(30, "area-c")

        self.db.executeInsert(
            "INSERT INTO task(assignee_keycloak_id, task_status_id, scvu_image_area_id) VALUES (%s, %s, %s)",
            ("kc-user-1", 1, image_area_id1),
        )
        self.db.executeInsert(
            "INSERT INTO task(assignee_keycloak_id, task_status_id, scvu_image_area_id) VALUES (%s, %s, %s)",
            ("kc-user-1", 1, image_area_id2),
        )
        self.db.executeInsert(
            "INSERT INTO task(assignee_keycloak_id, task_status_id, scvu_image_area_id) VALUES (%s, %s, %s)",
            ("kc-user-1", 1, image_area_id3),
        )

        results = self.tasking.getTaskingSummaryAreaDataForImages([scvu_image_id1, scvu_image_id2])
        image_ids = {row[0] for row in results}
        self.assertEqual(image_ids, {scvu_image_id1, scvu_image_id2}, "IN clause should filter image ids")

    def test_image_area_data_for_images_in_clause(self):
        scvu_image_id1, image_area_id1 = self._insert_image_with_area(100, "area-x")
        scvu_image_id2, image_area_id2 = self._insert_image_with_area(200, "area-y")

        self.db.executeInsert(
            "INSERT INTO task(assignee_keycloak_id, task_status_id, scvu_image_area_id) VALUES (%s, %s, %s)",
            ("kc-user-1", 1, image_area_id1),
        )
        self.db.executeInsert(
            "INSERT INTO task(assignee_keycloak_id, task_status_id, scvu_image_area_id) VALUES (%s, %s, %s)",
            ("kc-user-1", 1, image_area_id2),
        )

        results = self.images.getImageAreaDataForImages([scvu_image_id1])
        self.assertEqual(len(results), 1, "should return only rows for requested image ids")
        self.assertEqual(results[0][0], scvu_image_id1, "should return correct image id")

    def test_keycloak_get_users_with_presence(self):
        self.db.executeInsert(
            "INSERT INTO user_cache (keycloak_user_id, is_present) VALUES (%s, %s) ON CONFLICT (keycloak_user_id) DO NOTHING",
            ("kc-ii-1", True),
        )
        self.db.executeInsert(
            "INSERT INTO user_cache (keycloak_user_id, is_present) VALUES (%s, %s) ON CONFLICT (keycloak_user_id) DO NOTHING",
            ("kc-senior-1", False),
        )
        self.db.executeInsert(
            "INSERT INTO user_cache (keycloak_user_id, is_present) VALUES (%s, %s) ON CONFLICT (keycloak_user_id) DO NOTHING",
            ("kc-ia-1", True),
        )

        users = self.kc_queries.getUsers()
        presence_by_id = {user["id"]: user["is_present"] for user in users}
        self.assertEqual(presence_by_id["kc-ii-1"], True, "presence should be read from cache")
        self.assertEqual(presence_by_id["kc-senior-1"], False, "presence should be read from cache")
        self.assertEqual(presence_by_id["kc-ia-1"], True, "presence should be read from cache")

