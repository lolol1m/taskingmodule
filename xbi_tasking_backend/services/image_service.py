import datetime
import logging
import os
from datetime import timedelta
import dateutil.parser
from constants import TaskStatus
from formatters.image_formatter import (
    format_complete_image_area,
    format_complete_image_image,
)


logger = logging.getLogger("xbi_tasking_backend.image_service")

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


def _parse_date_range(payload):
    start_raw = payload["Start Date"]
    end_raw = payload["End Date"]
    use_exact_time = bool(payload.get("Use Exact Time", False))
    start_dt = dateutil.parser.isoparse(start_raw)
    end_dt = dateutil.parser.isoparse(end_raw)

    if not use_exact_time:
        start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = (end_dt + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return start_dt, end_dt


def _normalize_dsta_payload(payload):
    """
    Accept both legacy payload:
      { "images": [...] }
    and new payload:
      { "tasking": [ { "PassIDFileName": ..., "sensorName": ..., "image": [...] }, ... ] }
    """
    if not isinstance(payload, dict):
        return payload

    if isinstance(payload.get("images"), list):
        return payload

    tasking_items = payload.get("tasking")
    if not isinstance(tasking_items, list):
        return payload

    normalized_images = []
    for entry in tasking_items:
        if not isinstance(entry, dict):
            continue

        # New grouped-by-pass format:
        # one pass parent with child image rows.
        if isinstance(entry.get("image"), list):
            pass_id = entry.get("PassIDFileName")
            sensor_name = entry.get("sensorName")
            for img in entry.get("image", []):
                if not isinstance(img, dict):
                    continue
                img_id = img.get("imgId")
                if img_id is None:
                    continue

                raw_area_id = img.get("areaId", img.get("areaID"))
                # Display label for child rows should use imgName when available.
                area_name = img.get("imgName") or img.get("areaName")
                if not area_name and raw_area_id is not None and str(raw_area_id).strip() != "":
                    area_name = str(raw_area_id)
                if not area_name:
                    continue

                area_item = {
                    "areaId": raw_area_id,
                    "areaName": area_name,
                }
                if img.get("imgId") is not None:
                    area_item["childImgId"] = img.get("imgId")
                if img.get("imgName") is not None:
                    area_item["imgName"] = img.get("imgName")
                if img.get("color") is not None:
                    area_item["color"] = img.get("color")
                if img.get("service") is not None:
                    area_item["service"] = img.get("service")
                normalized_images.append(
                    {
                        "imgId": img_id,
                        # Child image row label (imgName) kept in image table.
                        "imageFileName": img.get("imgName") or str(img_id),
                        "passIdFileName": pass_id or str(img_id),
                        "sensorName": sensor_name,
                        "uploadDate": img.get("uploadDate"),
                        "imageDateTime": img.get("imageDateTime"),
                        "areas": [area_item],
                    }
                )
            continue

        # Legacy item shape inside "tasking" array
        if entry.get("imgId") is not None and entry.get("imageFileName") is not None:
            normalized_images.append(entry)

    return {"images": normalized_images}


class ImageService:
    def __init__(self, db, image_queries, tasking_queries):
        self.db = db
        self.images = image_queries
        self.tasking = tasking_queries

    def insert_dsta_data(self, payload, auto_assign=True):
        payload = _normalize_dsta_payload(payload)
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
                        existing = self.images.getImageByIdAndName(image["imgId"], image["imageFileName"])
                        image_already_exists = bool(existing)
                        if existing:
                            existing_images.append({
                                "image_id": image["imgId"],
                                "image_file_name": image["imageFileName"],
                            })
                        pass_id_file_name = image.get("passIdFileName")
                        scvu_pass_id = None
                        if pass_id_file_name:
                            scvu_pass_id = self.images.upsertPassReturningId(
                                pass_id_file_name,
                                image["sensorName"],
                                dateutil.parser.isoparse(image["uploadDate"]),
                                dateutil.parser.isoparse(image["imageDateTime"]),
                            )

                        if not image_already_exists:
                            self.images.insertSensor(image["sensorName"])
                            image_inserted = self.images.insertImage(
                                image["imgId"],
                                image["imageFileName"],
                                image["sensorName"],
                                dateutil.parser.isoparse(image["uploadDate"]),
                                dateutil.parser.isoparse(image["imageDateTime"]),
                                scvu_pass_id=scvu_pass_id,
                            )
                            if image_inserted:
                                image_count += 1
                            else:
                                existing_images.append({
                                    "image_id": image["imgId"],
                                    "image_file_name": image["imageFileName"],
                                    })
                                continue
                        image_auto_assignee_id = None
                        for area in image["areas"]:
                            try:
                                self.images.insertArea(area["areaName"])
                                self.images.insertImageAreaDSTA(
                                    image["imgId"],
                                    area["areaName"],
                                )
                                raw_area_id = area.get("areaId")
                                external_area_id = None
                                if raw_area_id is not None and str(raw_area_id).strip() != "":
                                    external_area_id = str(raw_area_id).strip()
                                color = area.get("color")
                                service = area.get("service")
                                raw_child_img_id = area.get("childImgId")
                                child_image_id = None
                                if raw_child_img_id is not None and str(raw_child_img_id).strip() != "":
                                    try:
                                        child_image_id = int(str(raw_child_img_id).strip())
                                    except (TypeError, ValueError):
                                        child_image_id = None
                                if external_area_id is not None:
                                    # Persist source area id + metadata for downstream tasking summary display.
                                    updated = self.images.updateImageAreaMetadataByExternalId(
                                        image["imgId"],
                                        external_area_id,
                                        color=color,
                                        service=service,
                                        child_image_id=child_image_id,
                                    )
                                    if not updated:
                                        self.images.updateImageAreaMetadataByName(
                                            image["imgId"],
                                            area["areaName"],
                                            external_area_id=external_area_id,
                                            color=color,
                                            service=service,
                                            child_image_id=child_image_id,
                                        )
                                elif color is not None or service is not None or child_image_id is not None:
                                    self.images.updateImageAreaMetadataByName(
                                        image["imgId"],
                                        area["areaName"],
                                        color=color,
                                        service=service,
                                        child_image_id=child_image_id,
                                    )
                                area_count += 1

                                if auto_assign:
                                    # Auto-assign once per image row, then reuse the same
                                    # assignee for remaining areas under that image.
                                    image_auto_assignee_id = self.tasking.autoAssign(
                                        area["areaName"],
                                        image["imgId"],
                                        preferred_assignee_keycloak_id=image_auto_assignee_id,
                                    )
                                    
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

    def update_pass_entry(self, payload):
        old_pass_id = payload.get("passIdFileName")
        new_pass_id = payload.get("newPassIdFileName")
        sensor_name = payload.get("sensorName")
        upload_date_raw = payload.get("uploadDate")
        image_dt_raw = payload.get("imageDateTime")
        if not old_pass_id:
            return {"success": False, "error": "Missing passIdFileName"}
        upload_date = dateutil.parser.isoparse(upload_date_raw) if upload_date_raw else None
        image_dt = dateutil.parser.isoparse(image_dt_raw) if image_dt_raw else None
        self.images.updatePassEntry(old_pass_id, new_pass_id, sensor_name, upload_date, image_dt)
        return {"success": True}

    def get_passes(self):
        return {"Passes": self.images.getPasses()}

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
            with self.db.transaction():
                self.images.uncompleteImage(image_id)
                self.tasking.resetImageTasksFromCompleted(image_id)

    def format_complete_image_area(self, area_data, image_id):
        return format_complete_image_area(area_data, image_id)
        
    def format_complete_image_image(self, image_data, area_data):
        return format_complete_image_image(image_data, area_data)

    def get_complete_image_data(self, payload, user=None):
        start_dt, end_dt = _parse_date_range(payload)
        _validate_date_range(start_dt, end_dt)
        limit, offset = _get_limit_offset(payload)

        image_data = self.images.getImageData(start_dt, end_dt, limit=limit, offset=offset)
        output = {}
        if not image_data:
            return output

        image_ids = [image[0] for image in image_data]
        area_rows = self.images.getImageAreaDataForImages(image_ids)
        area_map = {}
        for row in area_rows:
            # query_images.getImageAreaDataForImages returns:
            # (image_id, task_id, area_name, remarks, assignee, priority)
            image_id, task_id, area_name, remarks, assignee, priority = row
            area_map.setdefault(image_id, []).append(
                (task_id, area_name, remarks, assignee, priority)
            )

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

    def delete_image_area(self, payload):
        scvu_image_area_id = payload["SCVU Image Area ID"]
        with self.db.transaction():
            self.images.deleteTaskForImageArea(scvu_image_area_id)
            self.images.deleteImageArea(scvu_image_area_id)
        return {"success": True}
