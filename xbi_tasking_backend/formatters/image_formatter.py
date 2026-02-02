from GlobalUtils import datetime_format


def format_complete_image_area(area_data, image_id):
    return {
        "Area Name" : area_data[1],
        "Remarks" : area_data[2],
        "Assignee" : area_data[3],
        "Parent ID" : image_id,
    }


def format_complete_image_image(image_data, area_data):
    childList = []
    remarks = ''
    output = {
        'Sensor Name' : image_data[1],
        'Image File Name' : image_data[2],
        'Image ID' : image_data[3],
        'Upload Date' : image_data[4].strftime(datetime_format),
        'Image Datetime' : image_data[5].strftime(datetime_format),
        'Area' : area_data[0][1] if area_data and len(area_data) > 0 else '',
        'Assignee' : area_data[0][3] if area_data and len(area_data) > 0 else 'Unassigned',
        'Report' : image_data[6],
        'Priority' : image_data[7],
        'Image Category' : image_data[8],
        'Image Quality' : image_data[9],
        'Cloud Cover' : image_data[10],
        'EW Status' : image_data[11],
        'Vetter': image_data[12]
    }
    for area in area_data:
        childList.append(area[0])
        remarks += area[2] + "\n"
    output['Child ID'] = childList
    output['Remarks'] = remarks

    return output
