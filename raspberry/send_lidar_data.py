from rplidar import RPLidar
import time
import ssl
import json
import paho.mqtt.client as mqtt

# ---------- إعدادات AWS IoT ---------- #
ENDPOINT = "a1mkiwll5u8nwp-ats.iot.us-east-1.amazonaws.com"
PORT = 8883
CLIENT_ID = "MyLiDARDevice"
TOPIC = "lidar/data"

CA_PATH = "AmazonRootCA1.pem"
CERT_PATH = "certificate.pem.crt"
KEY_PATH = "private.pem.key"

# ---------- إعداد MQTT ---------- #
def on_connect(client, userdata, flags, rc):
    print("✅ Connected to AWS IoT with result code " + str(rc))

client = mqtt.Client(client_id=CLIENT_ID)
client.tls_set(ca_certs=CA_PATH, certfile=CERT_PATH, keyfile=KEY_PATH, tls_version=ssl.PROTOCOL_TLSv1_2)
client.on_connect = on_connect
client.connect(ENDPOINT, PORT, keepalive=60)
client.loop_start()

# ---------- إعداد LiDAR ---------- #
lidar = RPLidar('/dev/ttyUSB0', baudrate=115200)

try:
    print("🚀 Starting LiDAR scan and sending data to AWS IoT...")
    for i, scan in enumerate(lidar.iter_scans()):
        scan_data = []
        for (_, angle, distance) in scan:
            angle = int(angle)
            distance = int(distance / 10)  # نحولها من ملم إلى سم
            scan_data.append({
                "angle": angle,
                "distance": distance
            })

        payload = {
            "timestamp": time.time(),
            "scan": scan_data
        }

        json_payload = json.dumps(payload)
        client.publish(TOPIC, json_payload)
        print(f"📤 Sent scan {i + 1} to AWS IoT")


except KeyboardInterrupt:
    print("🛑 Stopping...")

finally:
    lidar.stop()
    lidar.stop_motor()
    lidar.disconnect()
    client.loop_stop()
    client.disconnect()
    print("✅ Done.")

