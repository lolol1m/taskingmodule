import logging
import dateutil.parser
from datetime import timedelta
from formatters.tasking_formatter import (
    format_tasking_summary_image,
    format_tasking_summary_area,
    format_tasking_manager_image,
    format_tasking_manager_area,
)


logger = logging.getLogger("xbi_tasking_backend.tasking_service")


class TaskingService:
    def __init__(self, query_manager, image_service=None):
        self.qm = query_manager
        self._image_service = image_service

    def get_tasking_summary(self, payload):
        output = {}
        image_datas = self.qm.getTaskingSummaryImageData(
            dateutil.parser.isoparse(payload['Start Date']).strftime(f"%Y-%m-%d"), 
            (dateutil.parser.isoparse(payload['End Date']) + timedelta(days=1)).strftime(f"%Y-%m-%d")
        )
        if not image_datas:
            return output
        image_ids = [image_data[0] for image_data in image_datas]
        area_rows = self.qm.getTaskingSummaryAreaDataForImages(image_ids)
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
        images = self.qm.getIncompleteImages(
            dateutil.parser.isoparse(payload['Start Date']).strftime(f"%Y-%m-%d"), 
            (dateutil.parser.isoparse(payload['End Date']) + timedelta(days=1)).strftime(f"%Y-%m-%d")
        )
        for image in images:
            areas = self.qm.getTaskingManagerDataForImage(image[0])
            image_areas = self.qm.getTaskingManagerDataForTask(image[0])

            # Filter out assigned areas; keep only unassigned areas in Tasking Manager
            if areas:
                all_area_ids = {area[0] for area in areas}
                assigned_area_ids = {
                    area_id for area_id, assignee, _ in image_areas
                    if assignee is not None and assignee != 'Unassigned' and assignee != ''
                }
                unassigned_area_ids = all_area_ids - assigned_area_ids
                if not unassigned_area_ids:
                    # All areas assigned, hide this image entirely
                    continue

                # Keep only task rows that correspond to unassigned areas
                image_areas = [
                    area_tuple for area_tuple in image_areas
                    if area_tuple[0] in unassigned_area_ids
                ]

            output[image[0]] = format_tasking_manager_image(image, image_areas)

            for area in areas:
                if area[0] not in unassigned_area_ids:
                    continue
                # Use negative area ID to avoid conflicts with image IDs
                output[-area[0]] = format_tasking_manager_area(image, area, image_areas)
        return output

    def update_tasking_manager(self, payload):
        for image in payload:
            if 'Priority' not in payload[image]:
                continue      
            self.qm.updateTaskingManagerData(image, payload[image]['Priority'])

    def assign_task(self, payload):
        task_status_id = self.qm.getTaskStatusID('Incomplete')
        if task_status_id is None:
            raise ValueError("Task status 'Incomplete' not found in database. Please ensure task_status table is initialized.")
        tasks_processed = 0
        for task in payload.get("Tasks", []):
            try:
                # Validate required fields
                if "Assignee" not in task or task["Assignee"] == None or task["Assignee"] == "":
                    continue
                
                if "SCVU Image Area ID" not in task or task["SCVU Image Area ID"] == None:
                    raise ValueError("Missing 'SCVU Image Area ID' in task")
                
                # Frontend now sends Keycloak user IDs directly (not usernames)
                # Check if it's already a Keycloak user ID (UUID format) or if it's a username
                assignee_keycloak_id = task["Assignee"]
                
                # If it's "Multiple", skip it
                if assignee_keycloak_id == "Multiple":
                    continue
                
                # If it doesn't look like a UUID (Keycloak user ID), try to get the ID from username
                # UUIDs are typically 36 characters with dashes
                if len(assignee_keycloak_id) != 36 or assignee_keycloak_id.count('-') != 4:
                    # It's probably a username, try to get the Keycloak user ID
                    assignee_keycloak_id = self.qm.getKeycloakUserID(assignee_keycloak_id)
                    if assignee_keycloak_id is None:
                        # Skip if assignee not found in Keycloak
                        continue
                
                area_id = task['SCVU Image Area ID']
                self.qm.assignTask(area_id, assignee_keycloak_id, task_status_id)
                tasks_processed += 1
            except Exception:
                logger.exception("Error processing task %s", task)
                raise
        return tasks_processed

    def start_tasks(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.qm.startTask(task_id)
    
    def complete_tasks(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.qm.completeTask(task_id)
    
    def verify_pass(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.qm.verifyPass(task_id)
    
    def verify_fail(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.qm.verifyFail(task_id)

    def update_tasking_summary(self, payload):
        for thing in payload:
            if 'Report' in payload[thing]:
                self.qm.updateTaskingSummaryImage(
                    thing, 
                    payload[thing]['Report'], 
                    payload[thing]['Image Category'], 
                    payload[thing]['Image Quality'], 
                    payload[thing]['Cloud Cover'], 
                    payload[thing]['Target Tracing']
                )
            if 'Remarks' in payload[thing]:
                self.qm.updateTaskingSummaryTask(
                    thing,
                    payload[thing]['Remarks']
                )

    def complete_images(self, payload, vetter_keycloak_id):
        return self._get_image_service().complete_images(payload, vetter_keycloak_id)

    def uncomplete_images(self, payload):
        return self._get_image_service().uncomplete_images(payload)

    def get_complete_image_data(self, payload, user):
        return self._get_image_service().get_complete_image_data(payload, user)

    def _get_image_service(self):
        if self._image_service is None:
            from services.image_service import ImageService
            self._image_service = ImageService(self.qm)
        return self._image_service
