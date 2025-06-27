import os
import google.generativeai as genai
import paho.mqtt.client as mqtt
import ssl
import json
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

app = Flask(__name__)
load_dotenv()

# إعداد Gemini
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("مفتاح GEMINI_API_KEY غير موجود في ملف .env")
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash-001')
chat = model.start_chat(history=[])

# إعداد MQTT (AWS IoT)
MQTT_ENDPOINT = os.getenv("MQTT_ENDPOINT", "a1mkiwll5u8nwp-ats.iot.us-east-1.amazonaws.com")
MQTT_PORT = 8883
TOPIC = "car/control"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CA_PATH = os.path.join(BASE_DIR, "certs/AmazonRootCA1.pem")
CERT_PATH = os.path.join(BASE_DIR, "certs/certificate.pem.crt")
KEY_PATH = os.path.join(BASE_DIR, "certs/private.pem.key")

mqtt_client = mqtt.Client(client_id="smartcar_client", protocol=mqtt.MQTTv311)
mqtt_client.tls_set(ca_certs=CA_PATH, certfile=CERT_PATH, keyfile=KEY_PATH, tls_version=ssl.PROTOCOL_TLSv1_2)
mqtt_client.connect(MQTT_ENDPOINT, MQTT_PORT, 60)
mqtt_client.loop_start()

# الأوامر الذكية
COMMAND_MAPPINGS = {
    "obstacle_avoidance": ["بدأ تجنب العوائق", "شغل تجنب العوائق", "ابدأ تجنب العقبات", "افتح برنامج تجنب العوائق", "تشغيل تجنب العوائق", "تجنب العوائق", "run obstacle avoidance", "start obstacle avoidance"],
    "esp": ["شغل الـ esp", "بدأ الـ esp", "افتح الـ esp", "تشغيل الـ esp", "run esp", "start esp", "esp شغل", "تشغيل برنامج الـ esp"],
    "raspi_config": ["افتح إعدادات الراسبري", "شغل إعدادات الراسبري", "بدأ إعدادات الراسبري", "تشغيل إعدادات الراسبري", "open raspi config", "run raspi-config", "إعدادات الراسبري", "افتح تكوين الراسبري"],
    "display_rplidar": ["اعرض قراءات الـ rplidar", "شغل قراءات الليدار", "بدأ عرض الليدار", "افتح قراءات الـ rplidar", "تشغيل الليدار", "عرض بيانات الليدار", "run rplidar", "display rplidar readings"]
}

# أوامر الحركة اليدوية
MANUAL_COMMANDS = {
    "FO": "تحرك للأمام",
    "LE": "تحرك لليسار",
    "RI": "تحرك لليمين",
    "BA": "تحرك للخلف",
    "ST": "توقف"
}

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/endex')
def serve_endex():
    return send_from_directory('.', 'endex.html')

@app.route('/chatbot')
def serve_chatbot():
    return send_from_directory('.', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.get_json()
        question = data.get('message', '').strip()

        if not question:
            return jsonify({"error": "الرسالة فاضية"}), 400

        if question == "..":
            return jsonify({"response": "تم إنهاء المحادثة. شكرًا!"})

        command_key = None
        for key, phrases in COMMAND_MAPPINGS.items():
            if any(phrase in question.lower() for phrase in phrases):
                command_key = key
                break

        if command_key:
            if command_key in MANUAL_COMMANDS:
                # لو أمر حركة، ابعت direction + speed
                payload = json.dumps({'direction': command_key, 'speed': 50})
            else:
                # لو أمر ذكي، ابعت command فقط
                payload = json.dumps({'command': command_key})
            mqtt_client.publish(TOPIC, payload, qos=1)
            return jsonify({"response": f"تم إرسال الأمر: {question} بنجاح عبر MQTT"})

        response = chat.send_message(question)
        chat.history.append({"role": "user", "parts": [question]})
        chat.history.append({"role": "model", "parts": [response.text]})
        return jsonify({"response": response.text})

    except Exception as e:
        return jsonify({"error": f"خطأ في السيرفر: {str(e)}"}), 500

@app.route('/control', methods=['POST'])
def control_endpoint():
    try:
        data = request.get_json()
        command = data.get('command', '').strip()
        speed = int(data.get('speed', 100))  # سرعة افتراضية

        if not command:
            return jsonify({"error": "الأمر فارغ"}), 400

        if command in MANUAL_COMMANDS:
            payload = json.dumps({'direction': command, 'speed': speed})
            mqtt_client.publish(TOPIC, payload, qos=1)
            return jsonify({"response": f"تم إرسال الأمر اليدوي: {MANUAL_COMMANDS[command]} بسرعة {speed} بنجاح عبر MQTT"})

        return jsonify({"error": "أمر غير معرف"}), 400

    except Exception as e:
        return jsonify({"error": f"خطأ في السيرفر: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

