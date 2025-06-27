import math
import json
import requests

def polar_to_cartesian(angle_deg, distance):
    angle_rad = math.radians(angle_deg)
    x = distance * math.cos(angle_rad)
    y = distance * math.sin(angle_rad)
    return x, y

def lambda_handler(event, context):
    # استلام بيانات LiDAR من IoT
    scan_data = event.get("scan", [])
    points = []

    # تحويل البيانات من Polar إلى Cartesian
    for point in scan_data:
        angle = point.get("angle")
        distance = point.get("distance")
        if angle is not None and distance is not None:
            x, y = polar_to_cartesian(angle, distance)
            points.append({"x": x, "y": y})

    # بناء الـ payload
    payload = {
        "timestamp": event.get("timestamp"),
        "points": points
    }

    # استخدام الـ EC2 Public IP الذي لديك
    ec2_url = "http://54.160.51.190:5000/lidar"

    try:
        # إرسال البيانات إلى EC2 باستخدام POST
        response = requests.post(ec2_url, json=payload)
        return {
            "statusCode": response.status_code,
            "body": response.text
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": f"Error sending data to EC2: {str(e)}"
        }
