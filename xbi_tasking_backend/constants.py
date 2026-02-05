import os


class TaskStatus:
    INCOMPLETE = "Incomplete"
    IN_PROGRESS = "In Progress"
    VERIFYING = "Verifying"
    COMPLETED = "Completed"


class AssigneeLabel:
    MULTIPLE = "Multiple"
    UNASSIGNED = "Unassigned"


class ContentType:
    JSON = {"application/json", "text/json"}
    CSV = {"text/csv", "application/vnd.ms-excel"}


# Default 20 MB upload limit unless overridden by MAX_UPLOAD_MB
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "20")) * 1024 * 1024
