# generate_daily_images.py
from datetime import datetime, timedelta
import random
import json
import os

# Seed for reproducibility
random.seed(42)

YEAR = datetime.now().year

# Dates from 17-23 May
dates = [
    datetime(YEAR, 5, 17),
    datetime(YEAR, 5, 18),
    datetime(YEAR, 5, 19),
    datetime(YEAR, 5, 20),
    datetime(YEAR, 5, 21),
    datetime(YEAR, 5, 22),
    datetime(YEAR, 5, 23),
]

sensor_names = [f"sensor{i}" for i in range(30, 40)]

file_names = [
    "holiday.gif",
    "family.gif",
    "nature.gif",
    "office.gif",
    "travel.gif",
    "friends.gif",
    "sunset.gif",
    "event.gif",
]

used_img_ids = set()

def generate_unique_img_id():
    while True:
        img_id = random.randint(1000, 9999)
        if img_id not in used_img_ids:
            used_img_ids.add(img_id)
            return img_id

def random_time_for_day(base_date):
    # random seconds within a day (0 to 86399)
    seconds = random.randint(0, 86399)
    return base_date + timedelta(seconds=seconds)

# Create output folder
# os.makedirs("daily_json", exist_ok=True)

for current_date in dates:

    images = []

    # Generate 5 images for the current day
    for _ in range(5):

        area_count = random.randint(1, 3)

        used_area_ids = set()
        areas = []

        for _ in range(area_count):

            while True:
                area_id = random.randint(1, 99)

                if area_id not in used_area_ids:
                    used_area_ids.add(area_id)
                    break

            areas.append({
                "areaId": area_id,
                "areaName": f"area_{area_id}"
            })
        
        timestamp = random_time_for_day(current_date)

        image_obj = {
            "imgId": generate_unique_img_id(),
            "imageFileName": random.choice(file_names),
            "sensorName": random.choice(sensor_names),
            "uploadDate": timestamp.isoformat() + "Z",
            "imageDateTime": timestamp.isoformat() + "Z",
            "areas": areas
        }

        images.append(image_obj)

    output = {
        "images": images
    }

    # File name example: 2026-05-17.json
    file_name = current_date.strftime("%Y-%m-%d") + ".json"
    output_dir = r"../dummy_data/demo_json"

    with open(f"{output_dir}/{file_name}", "w") as f:
        json.dump(output, f, indent=2)

    print(f"Created {file_name}")