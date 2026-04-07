import logging
import os
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


def _get_limit_offset(payload):
    limit = payload.get("Limit")
    offset = payload.get("Offset", 0)
    if limit is None:
        limit = int(os.getenv("MAX_QUERY_LIMIT", "1000"))
    try:
        limit = int(limit) if limit is not None else None
    except (TypeError, ValueError):
        limit = int(os.getenv("MAX_QUERY_LIMIT", "1000"))
    try:
        offset = int(offset) if offset is not None else 0
    except (TypeError, ValueError):
        offset = 0
    if limit is not None and limit <= 0:
        limit = None
    if offset < 0:
        offset = 0
    return limit, offset


def _validate_date_range(start_dt, end_dt):
    max_days = int(os.getenv("MAX_DATE_RANGE_DAYS", "90"))
    if end_dt < start_dt:
        raise ValueError("End Date must be after Start Date")
    if (end_dt - start_dt).total_seconds() > max_days * 24 * 60 * 60:
        raise ValueError(f"Date range cannot exceed {max_days} days")


def _parse_date_range(payload, add_day_for_legacy=False):
    start_raw = payload["Start Date"]
    end_raw = payload["End Date"]
    use_exact_time = bool(payload.get("Use Exact Time", False))
    start_dt = dateutil.parser.isoparse(start_raw)
    end_dt = dateutil.parser.isoparse(end_raw)

    # Backward compatibility for legacy date-only flows:
    # if end is date-only or midnight and exact-time mode is off,
    # treat it as inclusive day-range by adding one day.
    is_end_midnight = (
        end_dt.hour == 0
        and end_dt.minute == 0
        and end_dt.second == 0
        and end_dt.microsecond == 0
    )
    if not use_exact_time:
        if add_day_for_legacy:
            start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = (end_dt + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif "T" not in end_raw or is_end_midnight:
            end_dt = end_dt + timedelta(days=1)

    return start_dt, end_dt


class TaskingService:
    def __init__(self, tasking_queries, keycloak_queries, image_service=None, notification_service=None):
        self.tasking = tasking_queries
        self.keycloak = keycloak_queries
        self._image_service = image_service
        self._notification_service = notification_service

    def get_tasking_summary(self, payload, user=None):
        output = {}
        start_dt, end_dt = _parse_date_range(payload, add_day_for_legacy=True)
        _validate_date_range(start_dt, end_dt)
        limit, offset = _get_limit_offset(payload)

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
            image_datas = self.tasking.getTaskingSummaryImageDataForUser(
                start_dt,
                end_dt,
                assignee_keycloak_id,
                limit=limit,
                offset=offset,
            )
        else:
            image_datas = self.tasking.getTaskingSummaryImageData(
                start_dt,
                end_dt,
                limit=limit,
                offset=offset,
            )

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
            image_id = row[0]
            area_map.setdefault(image_id, []).append(tuple(row[1:]))
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
        start_dt, end_dt = _parse_date_range(payload, add_day_for_legacy=False)
        _validate_date_range(start_dt, end_dt)
        limit, offset = _get_limit_offset(payload)

        images = self.tasking.getIncompleteImages(start_dt, end_dt, limit=limit, offset=offset)
        if not images:
            return output

        image_ids = [image[0] for image in images]
        area_rows = self.tasking.getTaskingManagerDataForImages(image_ids)
        task_rows = self.tasking.getTaskingManagerDataForTasks(image_ids)

        areas_by_image = {}
        for image_id, image_area_id, area_name in area_rows:
            areas_by_image.setdefault(image_id, []).append((image_area_id, area_name))

        tasks_by_image = {}
        for row in task_rows:
            image_id = row[0]
            tasks_by_image.setdefault(image_id, []).append(tuple(row[1:]))

        for image in images:
            areas = areas_by_image.get(image[0], [])
            image_areas = tasks_by_image.get(image[0], [])

            output[image[0]] = format_tasking_manager_image(image, image_areas)

            for area in areas:
                # Use negative area ID to avoid conflicts with image IDs
                output[-area[0]] = format_tasking_manager_area(image, area, image_areas)
        return output

    def update_tasking_manager(self, payload):
        for image_area_id in payload:
            if "Priority" not in payload[image_area_id]:
                continue      
            updated_count = self.tasking.updateTaskingManagerData(image_area_id, payload[image_area_id]["Priority"])
            if not updated_count:
                raise ValueError(f"No task found for SCVU Image Area ID {image_area_id}")

    def assign_task(self, payload):
        task_status_id = self.tasking.getTaskStatusID(TaskStatus.INCOMPLETE)
        if task_status_id is None:
            raise ValueError(f"Task status '{TaskStatus.INCOMPLETE}' not found in database. Please ensure task_status table is initialized.")
        tasks_processed = 0
        tasks = payload.get("Tasks", [])
        resolved_tasks = []

        # Resolve assignees first so we can validate presence in one DB check.
        for task in tasks:
            # Validate required fields
            if "Assignee" not in task or task["Assignee"] is None or task["Assignee"] == "":
                continue
            if "SCVU Image Area ID" not in task or task["SCVU Image Area ID"] is None:
                raise ValueError("Missing 'SCVU Image Area ID' in task")

            assignee_keycloak_id = task["Assignee"]
            if assignee_keycloak_id == AssigneeLabel.MULTIPLE:
                continue

            # If it's not UUID format, treat as username and resolve user id.
            if len(assignee_keycloak_id) != 36 or assignee_keycloak_id.count('-') != 4:
                resolved_id = self.keycloak.getKeycloakUserID(assignee_keycloak_id)
                if resolved_id is None:
                    raise ValueError(f"Assignee '{assignee_keycloak_id}' not found in Keycloak")
                assignee_keycloak_id = resolved_id

            resolved_tasks.append((task["SCVU Image Area ID"], assignee_keycloak_id))

        present_ids = self.keycloak.get_present_user_ids([assignee_id for _, assignee_id in resolved_tasks])
        for area_id, assignee_keycloak_id in resolved_tasks:
            if assignee_keycloak_id not in present_ids:
                assignee_name = self.keycloak.get_keycloak_username(assignee_keycloak_id)
                raise ValueError(f"Cannot assign task to absent user '{assignee_name}'")

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
                        raise ValueError(f"Assignee '{task['Assignee']}' not found in Keycloak")
                
                area_id = task["SCVU Image Area ID"]
                self.tasking.assignTask(area_id, assignee_keycloak_id, task_status_id)
                tasks_processed += 1
            except Exception:
                logger.exception("Error processing task %s", task)
                raise
        return tasks_processed

    def auto_assign_tasks(self, payload):
        area_ids = payload.get("SCVU Image Area ID", [])
        processed = 0
        for area_id in area_ids:
            assigned = self.tasking.autoAssignForImageArea(area_id)
            if assigned:
                processed += 1
        return processed

    def start_tasks(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.tasking.startTask(task_id)

    def end_tasks(self, payload):
        for task_id in payload["SCVU Task ID"]:
            self.tasking.endTask(task_id)

    def complete_tasks(self, payload, user=None):
        task_ids = payload.get("SCVU Task ID", [])
        for task_id in task_ids:
            self.tasking.completeTask(task_id)
        self._push_reported_notifications(task_ids, user, stage_label="Task completed")
    
    def start_verification(self, payload, vetter_keycloak_id):
        for task_id in payload.get("SCVU Task ID", []):
            self.tasking.startVerification(task_id, vetter_keycloak_id)

    def unstart_verification(self, payload, vetter_keycloak_id):
        for task_id in payload.get("SCVU Task ID", []):
            self.tasking.unstartVerification(task_id, vetter_keycloak_id)

    def verify_pass(self, payload, vetter_keycloak_id=None, user=None):
        task_ids = payload.get("SCVU Task ID", [])
        submission_state = self.tasking.getTaskSubmissionStatusByIds(task_ids)
        for task_id in task_ids:
            state = submission_state.get(task_id)
            if not state:
                continue
            report = (state.get("report") or "").strip().upper()
            sf_reported = bool(state.get("sf_reported"))
            iir_reported = bool(state.get("iir_reported"))
            if report == "IIR" and not iir_reported:
                raise ValueError(
                    f"Task {task_id} requires IIR Reported to be checked in Submission before Verify Pass."
                )
            if report == "DS(SF)" and not sf_reported:
                raise ValueError(
                    f"Task {task_id} requires SF Reported to be checked in Submission before Verify Pass."
                )

        for task_id in task_ids:
            if vetter_keycloak_id:
                self.tasking.verifyPassWithVetter(task_id, vetter_keycloak_id)
            else:
                self.tasking.verifyPass(task_id)

        if not task_ids or self._image_service is None:
            return
        image_ids = self.tasking.getImageIdsForTasks(task_ids)
        if not image_ids:
            return
        self._image_service.complete_images({"SCVU Image ID": image_ids}, vetter_keycloak_id)
    
    def verify_fail(self, payload, vetter_keycloak_id=None):
        for task_id in payload.get("SCVU Task ID", []):
            self.tasking.verifyFail(task_id)

    def update_tasking_summary(self, payload):
        for image_id, image_data in payload.items():
            is_image_update = any(
                key in image_data for key in ("Child ID", "Image Category", "Target Tracing")
            )
            if is_image_update:
                self.tasking.updateTaskingSummaryImage(
                    image_id,
                    image_data.get("Report"),
                    image_data.get("Image Category"),
                    image_data.get("Image Quality"),
                    image_data.get("Cloud Cover"),
                    image_data.get("Target Tracing"),
                )
            if (not is_image_update) and (
                "Remarks" in image_data
                or "Report" in image_data
                or "Cloud Cover" in image_data
                or "Image Quality" in image_data
                or "SF Reported" in image_data
                or "IIR Reported" in image_data
            ):
                self.tasking.updateTaskingSummaryTask(
                    image_id,
                    image_data.get("Remarks"),
                    image_data.get("Report") if "Report" in image_data else None,
                    image_data.get("Cloud Cover") if "Cloud Cover" in image_data else None,
                    image_data.get("Image Quality") if "Image Quality" in image_data else None,
                    image_data.get("SF Reported") if "SF Reported" in image_data else None,
                    image_data.get("IIR Reported") if "IIR Reported" in image_data else None,
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

    @staticmethod
    def _coerce_bool(value):
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in ("true", "1", "yes", "y")
        return bool(value)

    @staticmethod
    def _build_notification_meta(context):
        pass_id = context.get("pass_id_file_name") or "N/A"
        image_name = context.get("image_file_name") or "N/A"
        image_id = context.get("image_id") or "N/A"
        area_name = context.get("area_name") or "N/A"
        return f"Pass {pass_id} · Image {image_name} (ID {image_id}) · Area {area_name}"

    def _push_reported_notifications(self, task_ids, user, stage_label):
        if not self._notification_service:
            return
        context_by_task = self.tasking.getTaskNotificationContextByIds(task_ids)
        for task_id in task_ids:
            context = context_by_task.get(task_id) or {}
            report = (context.get("report") or "").strip().upper()
            meta = self._build_notification_meta(context)
            if report == "DS(SF)":
                self._notification_service.push(
                    "SF Reported",
                    f"{meta} · Task {task_id} · {stage_label}",
                    user=user,
                    target_roles=["Senior II", "IA"],
                    persist=True,
                )
            if report == "IIR":
                self._notification_service.push(
                    "IIR Reported",
                    f"{meta} · Task {task_id} · {stage_label}",
                    user=user,
                    target_roles=["IA"],
                    persist=True,
                )
