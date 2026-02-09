import datetime
import logging
from datetime import timedelta
import dateutil.parser
from constants import TaskStatus
from formatters.image_formatter import (
    format_complete_image_area,
    format_complete_image_image,
)


logger = logging.getLogger("xbi_tasking_backend.image_service")


class ImageService:
    def __init__(self, db, image_queries, tasking_queries):
        self.db = db
        self.images = image_queries
        self.tasking = tasking_queries

    def insert_dsta_data(self, payload, auto_assign=True):
        image_count = 0
        area_count = 0
        errors = []
        existing_images = []
        if not payload or "images" not in payload or not isinstance(payload["images"], list):
            return {
                "success": False,
                "error": "Invalid payload: expected 'images' list",
                "images_inserted": image_count,
                "areas_inserted": area_count,
            }
        try:
            for image in payload["images"]:
                error_msg = None
                try:
                    with self.db.transaction():
                        self.images.insertSensor(image["sensorName"])
                        image_inserted = self.images.insertImage(
                            image["imgId"],
                            image["imageFileName"],
                            image["sensorName"],
                            dateutil.parser.isoparse(image["uploadDate"]),
                            dateutil.parser.isoparse(image["imageDateTime"]),
                        )
                        if image_inserted:
                            image_count += 1
                        else:
                            existing_images.append({
                                "image_id": image["imgId"],
                                "image_file_name": image["imageFileName"],
                                })
                            continue
                        for area in image["areas"]:
                            try:
                                self.images.insertArea(area["areaName"])
                                self.images.insertImageAreaDSTA(
                                    image["imgId"],
                                    area["areaName"],
                                )
                                area_count += 1

                                if auto_assign:
                                    self.tasking.autoAssign(area["areaName"], image["imgId"])
                                    
                            except Exception as e:
                                area_name = area.get("areaName", "unknown")
                                error_msg = f"Error inserting area {area_name} for image {image['imgId']}: {str(e)}"
                                errors.append(error_msg)
                                raise
                except Exception as e:
                    if not error_msg:
                        image_id = image.get("imgId", "unknown")
                        error_msg = f"Error inserting image {image_id}: {str(e)}"
                        errors.append(error_msg)
                    logger.warning(error_msg)
            
            result = {
                "success": True,
                "images_inserted": image_count,
                "areas_inserted": area_count
            }

            message_parts = [f"Successfully inserted {image_count} images and {area_count} areas"]
            if existing_images:
                existing_str = ", ".join(f"{img['image_file_name']} (ID: {img['image_id']})" for img in existing_images)
                message_parts.append(f"{len(existing_images)} already existed: {existing_str}")
            if errors:
                result["errors"] = errors
                message_parts.append(f"{len(errors)} errors encountered")

            result["message"] = " | ".join(message_parts)
            logger.info("insertDSTAData result: %s", result)
            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "images_inserted": image_count,
                "areas_inserted": area_count
            }

    def insert_ttg_data(self, payload):
        required_fields = ['imageFileName', 'sensorName', 'uploadDate', 'imageDateTime', 'areas']
        missing = [field for field in required_fields if field not in payload]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        with self.db.transaction():
            self.images.insertSensor(payload['sensorName'])
            scvu_image_id = self.images.insertTTGImageReturnsId(
                payload['imageFileName'],
                payload['sensorName'],
                dateutil.parser.isoparse(payload['uploadDate']),
                dateutil.parser.isoparse(payload['imageDateTime'])
            )
            for area_name in payload['areas']:
                self.images.insertArea(area_name)
                self.images.insertImageAreaTTG(scvu_image_id, area_name)

    def complete_images(self, payload, vetter_keycloak_id):
        current_datetime = datetime.datetime.today()
        results = {}
        for i in range(len(payload["SCVU Image ID"])):
            image_id = payload["SCVU Image ID"][i]
            result = self._complete_image(image_id, vetter_keycloak_id, current_datetime)
            results[image_id] = result
        return results

    def _complete_image(self, scvu_image_id, vetter_keycloak_id, current_datetime):
        tasks = self.tasking.getAllTaskStatusForImage(scvu_image_id)
        if not tasks:
            return {"error": f"Cannot complete image {scvu_image_id}: No tasks found"}
        completed_task_id = self.tasking.getTaskStatusID(TaskStatus.COMPLETED)
        incomplete_tasks = []
        for task in tasks:
            if task[1] != completed_task_id:
                incomplete_tasks.append(task[0])
        if incomplete_tasks:
            return {"error": f"Cannot complete image {scvu_image_id}: Tasks {incomplete_tasks} are not completed"}
        self.images.completeImage(scvu_image_id, vetter_keycloak_id, current_datetime)
        return {"success": f"Image {scvu_image_id} completed"}

    def uncomplete_images(self, payload):
        for image_id in payload["SCVU Image ID"]:
            self.images.uncompleteImage(image_id)

    def format_complete_image_area(self, area_data, image_id):
        return format_complete_image_area(area_data, image_id)
        
    def format_complete_image_image(self, image_data, area_data):
        return format_complete_image_image(image_data, area_data)

    def get_complete_image_data(self, payload, user=None):
        start_date = dateutil.parser.isoparse(payload["Start Date"]).strftime("%Y-%m-%d")
        end_date = (dateutil.parser.isoparse(payload["End Date"]) + timedelta(days=1)).strftime("%Y-%m-%d")

        account_type = None
        roles = []
        if user:
            account_type = user.get("account_type")
            roles = user.get("roles", [])

        is_ii_user = account_type == "II" or ("II" in roles and account_type != "Senior II" and account_type != "IA")
        if is_ii_user and user:
            image_data = self.images.getImageDataForUser(start_date, end_date, user.get("sub"))
        else:
            image_data = self.images.getImageData(start_date, end_date)
        output = {}
        if not image_data:
            return output

        image_ids = [image[0] for image in image_data]
        area_rows = self.images.getImageAreaDataForImages(image_ids)
        area_map = {}
        for row in area_rows:
            image_id, task_id, area_name, remarks, assignee = row
            area_map.setdefault(image_id, []).append((task_id, area_name, remarks, assignee))

        for image in image_data:
            image_id = image[0]
            area_data = area_map.get(image_id, [])
            output[image_id] = self.format_complete_image_image(image, area_data)
            for area in area_data:
                output[-area[0]] = self.format_complete_image_area(area, image_id)
        return output               

    def delete_image(self, payload):
        scvu_image_id = payload["SCVU Image ID"]
        with self.db.transaction():
            self.images.deleteTasksForImage(scvu_image_id)
            self.images.deleteImageAreasForImage(scvu_image_id)
            self.images.deleteImage(scvu_image_id)
        return {"success": True}
