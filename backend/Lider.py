from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS

app = Flask(__name__, static_folder='static')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

latest_lidar_points = []

@app.route('/lidar', methods=['POST'])
def lidar():
    global latest_lidar_points
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    latest_lidar_points = data.get("points", [])
    print(f"Received {len(latest_lidar_points)} points from Lambda.")

    socketio.emit('update_lidar', {"points": latest_lidar_points})
    return 'OK', 200

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)

