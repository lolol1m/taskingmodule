import logging
from datetime import timedelta
import dateutil.parser
from formatters.tasking_formatter import (
    format_tasking_summary_image,
    format_tasking_summary_area,
    format_tasking_manager_image,
    format_tasking_manager_area,
)
from constants import AssigneeLabel, TaskStatus


logger = logging.getLogger("xbi_tasking_backend.tasking_service")


class TaskingService:
    def __init__(self, tasking_queries, keycloak_queries, image_service=None):
        self.tasking = tasking_queries
        self.keycloak = keycloak_queries
        self._image_service = image_service

    def get_tasking_summary(self, payload, user=None):
        output = {}
        start_date = dateutil.parser.isoparse(payload["Start Date"]).strftime("%Y-%m-%d")
        end_date = (dateutil.parser.isoparse(payload["End Date"]) + timedelta(days=1)).strftime("%Y-%m-%d")

        # Check if user is a basic II user (only sees their own tasks)
        is_ii_user = False
        assignee_keycloak_id = None
        if user:
            account_type = user.get("account_type")
            roles = user.get("roles", []) or []
            # Basic II user: has II role but not Senior II or IA
            is_ii_user = account_type == "II" or ("II" in roles and account_type not in ("Senior II", "IA"))
            if is_ii_user:
                assignee_keycloak_id = user.get("sub")

        # Get image data based on user role
        if is_ii_user and assignee_keycloak_id:
            image_datas = self.tasking.getTaskingSummaryImageDataForUser(start_date, end_date, assignee_keycloak_id)
        else:
            image_datas = self.tasking.getTaskingSummaryImageData(start_date, end_date)

        if not image_datas:
            return output

        image_ids = [image_data[0] for image_data in image_datas]

        # Get area data based on user role
        if is_ii_user and assignee_keycloak_id:
            area_rows = self.tasking.getTaskingSummaryAreaDataForImagesForUser(image_ids, assignee_keycloak_id)
        else:
            area_rows = self.tasking.getTaskingSummaryAreaDataForImages(image_ids)

        area_map = {}
        for row in area_rows:
            image_id, task_id, area_name, task_status, remarks, username, v10, opsv = row
            area_map.setdefault(image_id, []).append(
                (task_id, area_name, task_status, remarks, username, v10, opsv)
            )
        for image_data in image_datas:
            image_id = image_data[0]
            area_datas = area_map.get(image_id, [])
            output[image_id] = format_tasking_summary_image(image_data, area_datas)
            for area_data in area_datas:
                task_id = area_data[0]
                # Use a negative key for tasks to avoid conflicts with image IDs
                # Frontend will still work because it uses Parent ID to identify child rows
                output[-task_id] = format_tasking_summary_area(area_data, image_id)
        return output

    def get_tasking_manager(self, payload):
        output = {}
        start_raw = payload["Start Date"]
        end_raw = payload["End Date"]
        start_dt = dateutil.parser.isoparse(start_raw)
        end_dt = dateutil.parser.isoparse(end_raw)
        if "T" not in end_raw:
            end_dt = end_dt + timedelta(days=1)

        images = self.tasking.getIncompleteImages(start_dt, end_dt)
        for image in images:
            areas = self.tasking.getTaskingManagerDataForImage(image[0])
            image_areas = self.tasking.getTaskingManagerDataForTask(image[0])

            output[image[0]] = format_tasking_manager_image(image, image_areas)

            for area in areas:
                # Use negative area ID to avoid conflicts with image IDs
                output[-area[0]] = format_tasking_manager_area(image, area, image_areas)
        return output

    def update_tasking_manager(self, payload):
        for image_id in payload:
            if "Priority" not in payload[image_id]:
                continue      
            self.tasking.updateTaskingManagerData(image_id, payload[image_id]["Priority"])

    def assign_task(self, payload):
        task_status_id = self.tasking.getTaskStatusID(TaskStatus.INCOMPLETE)
        if task_status_id is None:
            raise ValueError(f"Task status '{TaskStatus.INCOMPLETE}' not found in database. Please ensure task_status table is initialized.")
        tasks_processed = 0
        tasks = payload.get("Tasks", [])
        for task in tasks:
            try:
                # Validate required fields
                if "Assignee" not in task or task["Assignee"] is None or task["Assignee"] == "":
                    continue
                
                if "SCVU Image Area ID" not in task or task["SCVU Image Area ID"] is None:
                    raise ValueError("Missing 'SCVU Image Area ID' in task")
                
                # Frontend now sends Keycloak user IDs directly (not usernames)
                # Check if it's already a Keycloak user ID (UUID format) or if it's a username
                assignee_keycloak_id = task["Assignee"]
                
                # If it's "Multiple", skip it
                if assignee_keycloak_id == AssigneeLabel.MULTIPLE:
                    continue
                
                # If it doesn't look like a UUID (Keycloak user ID), try to get the ID from username
                # UUIDs are typically 36 characters with dashes
                if len(assignee_keycloak_id) != 36 or assignee_keycloak_id.count('-') != 4:
                    # It's probably a username, try to get the Keycloak user ID
                    assignee_keycloak_id = self.keycloak.getKeycloakUserID(assignee_keycloak_id)
                    if assignee_keycloak_id is None:
                        # Skip if assignee not found in Keycloak
                        continue
                
                area_id = task["SCVU Image Area ID"]
                self.tasking.assignTask(area_id, assignee_keycloak_id, task_status_id)
                tasks_processed += 1
            except Exception:
                logger.exception("Error processing task %s", task)
                raise
        return tasks_processed

    def start_tasks(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.tasking.startTask(task_id)
    
    def complete_tasks(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.tasking.completeTask(task_id)
    
    def verify_pass(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.tasking.verifyPass(task_id)
    
    def verify_fail(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.tasking.verifyFail(task_id)

    def update_tasking_summary(self, payload):
        for image_id, image_data in payload.items():
            if "Report" in image_data:
                self.tasking.updateTaskingSummaryImage(
                    image_id,
                    image_data["Report"],
                    image_data["Image Category"],
                    image_data["Image Quality"],
                    image_data["Cloud Cover"],
                    image_data["Target Tracing"],
                )
            if "Remarks" in image_data:
                self.tasking.updateTaskingSummaryTask(
                    image_id,
                    image_data["Remarks"],
                )

    def complete_images(self, payload, vetter_keycloak_id):
        return self._get_image_service().complete_images(payload, vetter_keycloak_id)

    def uncomplete_images(self, payload):
        return self._get_image_service().uncomplete_images(payload)

    def get_complete_image_data(self, payload, user):
        return self._get_image_service().get_complete_image_data(payload, user)

    def _get_image_service(self):
        if self._image_service is None:
            raise RuntimeError("ImageService dependency not configured")
        return self._image_service
