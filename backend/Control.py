from flask import Flask, request, render_template, jsonify
import paho.mqtt.client as mqtt
import ssl
import json

app = Flask(__name__)

# AWS IoT MQTT settings
MQTT_ENDPOINT = "a1mkiwll5u8nwp-ats.iot.us-east-1.amazonaws.com"
MQTT_PORT = 8883
TOPIC = "car/control"

# Certificates
CA_PATH = "certs/AmazonRootCA1.pem"
CERT_PATH = "certs/certificate.pem.crt"
KEY_PATH = "certs/private.pem.key"

# إعداد MQTT client
mqtt_client = mqtt.Client()
mqtt_client.tls_set(ca_certs=CA_PATH,
                    certfile=CERT_PATH,
                    keyfile=KEY_PATH,
                    tls_version=ssl.PROTOCOL_TLSv1_2)

mqtt_client.connect(MQTT_ENDPOINT, MQTT_PORT, 60)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send_command', methods=['POST'])
def send_command():
    data = request.json
    direction = data.get('direction')
    speed = data.get('speed', 0)

    if direction not in ["FO", "BA", "LE", "RI", "ST"]:
        return jsonify({"error": "Invalid direction"}), 400

    payload = {
        "direction": direction,
        "speed": speed
    }

    mqtt_client.publish(TOPIC, json.dumps(payload))
    return jsonify({"message": "Command sent successfully!"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
