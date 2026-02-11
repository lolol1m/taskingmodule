from pydantic import BaseModel, Field, RootModel


class DateRangePayload(BaseModel):
    start_date: str = Field(..., alias="Start Date")
    end_date: str = Field(..., alias="End Date")
    use_exact_time: bool = Field(False, alias="Use Exact Time")

    model_config = {"populate_by_name": True}


class TaskIdsPayload(BaseModel):
    task_ids: list[int] = Field(..., alias="SCVU Task ID")

    model_config = {"populate_by_name": True}


class ImageIdsPayload(BaseModel):
    image_ids: list[int] = Field(..., alias="SCVU Image ID")

    model_config = {"populate_by_name": True}


class TaskAssignment(BaseModel):
    scvu_image_area_id: int = Field(..., alias="SCVU Image Area ID")
    assignee: str = Field(..., alias="Assignee")

    model_config = {"populate_by_name": True}


class AssignTaskPayload(BaseModel):
    tasks: list[TaskAssignment] = Field(..., alias="Tasks")

    model_config = {"populate_by_name": True}


class OpsvArea(BaseModel):
    id: int = Field(..., alias="ID")
    area_name: str = Field(..., alias="Area Name")
    ops_v: bool = Field(..., alias="OPS V")

    model_config = {"populate_by_name": True}


class OpsvAreasPayload(BaseModel):
    areas: list[OpsvArea] = Field(..., alias="Areas")

    model_config = {"populate_by_name": True}


class StatusResponse(BaseModel):
    status: str
    message: str | None = None


class UsersResponse(BaseModel):
    Users: list
    Warning: str | None = None


class NotificationsResponse(BaseModel):
    Notifications: list


class KeyValueMapResponse(RootModel[dict]):
    pass


class CreateUserPayload(BaseModel):
    username: str
    password: str
    role: str


class InsertTTGPayload(BaseModel):
    imageFileName: str
    sensorName: str
    uploadDate: str
    imageDateTime: str
    areas: list[str]


class DeleteImagePayload(BaseModel):
    image_id: int = Field(..., alias="SCVU Image ID")

    model_config = {"populate_by_name": True}


class SensorCategoryUpdate(BaseModel):
    name: str = Field(..., alias="Name")
    category: str = Field(..., alias="Category")

    model_config = {"populate_by_name": True}


class UpdateSensorCategoryPayload(BaseModel):
    sensors: list[SensorCategoryUpdate] = Field(..., alias="Sensors")

    model_config = {"populate_by_name": True}


class UpdateTaskingSummaryPayload(RootModel[dict]):
    pass


class UpdateTaskingManagerPayload(RootModel[dict]):
    pass


class ChangePasswordPayload(BaseModel):
    current_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., alias="newPassword")

    model_config = {"populate_by_name": True}


class AdminResetPasswordPayload(BaseModel):
    target_username: str = Field(..., alias="targetUsername")
    new_password: str = Field(..., alias="newPassword")

    model_config = {"populate_by_name": True}
