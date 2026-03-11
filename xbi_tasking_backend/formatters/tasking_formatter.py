from GlobalUtils import datetime_format


def format_tasking_summary_image(image, areas):
    if not areas or len(areas) == 0:
        return {
            "Sensor Name": image[1],
            "Image File Name": image[2],
            "Image ID": image[3],
            "Upload Date": image[4].strftime(datetime_format),
            "Image Datetime": image[5].strftime(datetime_format),
            "Report": image[6],
            "Priority": image[7],
            "Image Category": image[8],
            "Image Quality": image[9],
            "Cloud Cover": image[10],
            "EW Status": image[11],
            "Target Tracing": image[12],
            "Area": "No areas",
            "Task Completed": "0/0",
            "V10": False,
            "OPS V": False,
            "Remarks": "",
            "Child ID": [],
            "Assignee": "Unassigned"
        }
    
    count = 0
    remarks = ""
    child_id = []
    assignee = areas[0][4] if len(areas[0]) > 4 else "Unassigned"
    v10 = False
    opsv = False
    for area in areas:
        child_id.append(area[0])
        remarks += (area[3] if area[3] else "") + "\n"
        if area[2] == "Completed":
            count += 1
        if assignee != area[4]:
            assignee = "multiple"
        v10 = v10 or (area[5] if len(area) > 5 else False)
        opsv = opsv or (area[6] if len(area) > 6 else False)

    return {
        "Sensor Name": image[1],
        "Image File Name": image[2],
        "Image ID": image[3],
        "Upload Date": image[4].strftime(datetime_format),
        "Image Datetime": image[5].strftime(datetime_format),
        "Report": image[6],
        "Priority": image[7],
        "Image Category": image[8],
        "Image Quality": image[9],
        "Cloud Cover": image[10],
        "EW Status": image[11],
        "Target Tracing": image[12],
        "Area": areas[0][1] if len(areas[0]) > 1 else "Unknown",
        "Task Completed": str(count) + "/" + str(len(areas)),
        "V10": v10,
        "OPS V": opsv,
        "Remarks": remarks,
        "Child ID": child_id,
        "Assignee": assignee
    }


def format_tasking_summary_area(area, parent_id):
    return {
        "Area Name": area[1],
        "Assignee": area[4],
        "Task Status": area[2],
        "Remarks": area[3],
        "Area ID": area[7],
        "Image ID": area[8],
        "Color": area[9],
        "Service": area[10],
        "Report": area[11],
        "Cloud Cover": area[12],
        "Image Quality": area[13],
        "Priority": area[14],
        "Exploit Start Time": area[15].strftime(datetime_format) if area[15] else None,
        "Exploit End Time": area[16].strftime(datetime_format) if area[16] else None,
        "SCVU Task ID": area[0],
        "Parent ID": parent_id
    }


def format_tasking_manager_image(image_data, image_areas_data):
    assignee = None
    if len(image_areas_data) != 0:
        assignee = image_areas_data[0][1]
    for area in image_areas_data:
        if assignee != area[1]:
            assignee = "multiple"
    return {
        'Sensor Name': image_data[1],
        'Image File Name': image_data[2],
        'Image ID': image_data[3],
        'Upload Date': image_data[4].strftime(datetime_format),
        'Image Datetime': image_data[5].strftime(datetime_format),
        'Priority': image_data[6],
        'TTG': image_data[3] == None,
        'Assignee': assignee
    }


def format_tasking_manager_area(image_data, area_data, image_areas_data):
    assignee = None
    remarks = None
    priority = None
    for image_area in image_areas_data:
        if area_data[0] == image_area[0]:
            assignee = image_area[1]
            remarks = image_area[2]
            priority = image_area[3] if len(image_area) > 3 else None
    return {
        'Area Name': area_data[1],
        'Parent ID': image_data[0],
        'SCVU Image Area ID': area_data[0],
        'Assignee': assignee,
        'Remarks': remarks,
        'Priority': priority,
    }
