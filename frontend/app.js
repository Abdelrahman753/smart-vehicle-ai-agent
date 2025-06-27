// ========== LIDAR Canvas Logic ==========
const canvas = document.getElementById('lidar-canvas');
const ctx = canvas.getContext('2d');
// هذا الاتصال خاص بالـ LIDAR. الشات بوت سيستخدم HTTP Fetch.
const socketLidar = io('http://18.215.125.242:5000'); // تم تغيير اسم المتغير لتمييزه

let scale = 1.0;
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

let mapPoints = [];
let dynamicPoints = [];

let lastStaticScanCenter = { x: 0, y: 0 };
const staticScanThreshold = 100;

function drawGrid() {
  ctx.fillStyle = '#777';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'red';
  ctx.beginPath();
  ctx.moveTo(centerX - 30, centerY);
  ctx.lineTo(centerX + 30, centerY);
  ctx.stroke();

  ctx.strokeStyle = 'green';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 30);
  ctx.lineTo(centerX, centerY + 30);
  ctx.stroke();
}

function drawPoint(x, y, color = 'white') {
  const drawX = centerX + x * scale;
  const drawY = centerY - y * scale;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function isNear(x1, y1, x2, y2, threshold = 10) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

function render() {
  drawGrid();
  mapPoints.forEach(([x, y]) => drawPoint(x, y, 'white'));
  dynamicPoints.forEach(([x, y]) => drawPoint(x, y, 'yellow'));
  requestAnimationFrame(render);
}

socketLidar.on('update_lidar', (data) => {
  const points = data.points || [];
  dynamicPoints = [];
  let sumX = 0, sumY = 0, validPoints = 0;
  points.forEach(p => {
    if (typeof p.x === 'number' && typeof p.y === 'number') {
      sumX += p.x; sumY += p.y; validPoints++;
    }
  });
  if (validPoints === 0) return;
  const avgX = sumX / validPoints;
  const avgY = sumY / validPoints;
  const movedFar = !isNear(avgX, avgY, lastStaticScanCenter.x, lastStaticScanCenter.y, staticScanThreshold);
  points.forEach(p => {
    if (typeof p.x === 'number' && typeof p.y === 'number') {
      const isNearStatic = mapPoints.some(([mx, my]) => isNear(p.x, p.y, mx, my, 5));
      if (isNearStatic) return;
      if (movedFar) { mapPoints.push([p.x, p.y]); } else { dynamicPoints.push([p.x, p.y]); }
    }
  });
  if (movedFar) { lastStaticScanCenter = { x: avgX, y: avgY }; }
});

function calculateAutoScale(allPoints) {
  if (allPoints.length === 0) return 1.0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  allPoints.forEach(([x, y]) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  });
  const margin = 50;
  const rangeX = Math.abs(maxX - minX) + margin;
  const rangeY = Math.abs(maxY - minY) + margin;
  if (rangeX === 0 || rangeY === 0) return 1.0;
  const scaleX = canvas.width / rangeX;
  const scaleY = canvas.height / rangeY;
  return Math.min(scaleX, scaleY, 1.5);
}

// ========== FullScreen Toggle Logic ==========
function toggleFullScreen(element) {
  if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
    if (element.requestFullscreen) { element.requestFullscreen(); }
    else if (element.mozRequestFullScreen) { element.mozRequestFullScreen(); }
    else if (element.webkitRequestFullscreen) { element.webkitRequestFullscreen(); }
    else if (element.msRequestFullscreen) { element.msRequestFullscreen(); }
  } else {
    if (document.exitFullscreen) { document.exitFullscreen(); }
    else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
    else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
    else if (document.msExitFullscreen) { document.msExitFullscreen(); }
  }
}

const liveStreamElement = document.getElementById('live-stream');
if (liveStreamElement) liveStreamElement.onclick = function() { toggleFullScreen(this); };
const lidarCanvasElement = document.getElementById('lidar-canvas');
if (lidarCanvasElement) lidarCanvasElement.onclick = function() { toggleFullScreen(this); };
//const chatBoxElementForFullScreen = document.getElementById('chat-box'); // !!! تأكد من هذا المعرف
///if (chatBoxElementForFullScreen) chatBoxElementForFullScreen.onclick = function() { toggleFullScreen(this); };

// ========== Modal Logic ==========
window.openModal = function(view) {
  var modal = document.getElementById('modal');
  var modalView = document.getElementById('modal-view');
  if (!modal || !modalView) { console.error('Modal elements not found!'); return; }
  modalView.innerHTML = '';
  if (view === 'live-stream') {
    modalView.innerHTML = '<img src="http://192.168.8.103:8080/?action=stream" alt="Live Stream" style="width:100%; height:auto;" />';
  } else if (view === 'lidar') {
    modalView.innerHTML = '<h3>LiDAR View (Modal)</h3><p>To render LiDAR in modal, specific logic is needed here.</p>';
  } else if (view === 'chat-bot') {
    const chatMessagesArea = document.getElementById('chat-messages'); // !!! استخدم المعرف الصحيح
    if (chatMessagesArea) {
        modalView.innerHTML = `<div id="chat-messages-modal" class="chat-box-modal" style="height: 350px; width:100%; overflow-y: auto; border: 1px solid #555; padding: 10px; margin-bottom:10px;">${chatMessagesArea.innerHTML}</div>`;
        modalView.innerHTML += '<input id="chat-input-modal" type="text" placeholder="Write Order..." style="width: calc(100% - 85px); padding: 8px;" />';
        modalView.innerHTML += '<button onclick="sendCommandModal()" style="padding: 8px; width: 75px;">Send</button>';
    } else {
        modalView.innerHTML = '<p>Error: Chat messages area ID ("chat-messages") not found.</p>';
    }
  }
  modal.style.display = 'flex';
};
window.closeModal = function() {
  var modal = document.getElementById('modal');
  if (modal) modal.style.display = 'none';
};
window.sendCommandModal = function() {
    const inputModal = document.getElementById('chat-input-modal');
    if (!inputModal) return;
    const messageText = inputModal.value.trim();
    if (messageText === '') return;
    const chatMessagesModal = document.getElementById('chat-messages-modal');
    if (chatMessagesModal) { /* ... (كود عرض رسالة المستخدم في المودال) ... */ }
    console.log("Modal message to send:", messageText);
    // !!! تحتاج لتنفيذ منطق الإرسال للـ backend هنا واستقبال الرد في المودال !!!
    // يمكنك استدعاء window.sendMessage(messageText) إذا أردت أن يتم عرض الرد في الشات الرئيسي
    // أو نسخ منطق fetch هنا وتوجيه الرد لـ chatMessagesModal
    inputModal.value = '';
    alert('sendCommandModal is a placeholder. Implement backend communication for modal chat.');
};

// ========== Chatbot Logic (Modified for HTTP Fetch with more Logging) ==========
document.addEventListener('DOMContentLoaded', () => {
    const userInputElement = document.getElementById('user-input');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const botTypingIndicator = document.getElementById('bot-typing');

    if (!userInputElement || !chatMessagesContainer || !botTypingIndicator) {
        console.error("Chatbot UI elements not found! Check IDs: user-input, chat-messages, bot-typing");
        return;
    }

    window.sendMessage = async function(messageOverride) {
        const messageText = messageOverride || userInputElement.value.trim();
        if (messageText === '') {
            return;
        }

        if (!messageOverride) {
            appendMessageToChat(messageText, 'user-message');
            if(userInputElement) userInputElement.value = ''; // تأكد من وجود العنصر
        }
        if(botTypingIndicator) botTypingIndicator.style.display = 'block'; // تأكد من وجود العنصر

        // !!! مهم جداً جداً: استبدل هذا الرابط بعنوان URL الصحيح لخادم Node.js الخاص بك !!!
        const backendUrl = 'http://localhost:3000/chat'; // <--- عدّل هذا الرابط فوراً!
        
        console.log('sendMessage: Attempting to send message:', messageText);
        console.log('sendMessage: Using backend URL:', backendUrl);

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageText }),
            });

            console.log('sendMessage: Received response object from fetch:', response);

            if(botTypingIndicator) botTypingIndicator.style.display = 'none';

            if (!response.ok) {
                const errorText = await response.text(); // حاول قراءة الرد كنص أولاً
                console.error('sendMessage: Backend response not OK. Status:', response.status, response.statusText, 'Response Text:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText); // ثم حاول تحليله كـ JSON
                } catch (e) {
                    errorData = { error: errorText || 'Failed to parse error response from server' };
                }
                appendMessageToChat(`Error: ${errorData.error || response.statusText || 'Could not reach server.'}`, 'system-error');
                return;
            }

            const data = await response.json();
            console.log('sendMessage: Received data from backend:', data);

            if (data.reply) {
                appendMessageToChat(data.reply, 'robot-message');
            } else {
                console.warn('sendMessage: Reply from backend is missing or empty.', data);
                appendMessageToChat('Received an unexpected or empty response from the bot.', 'system-error');
            }

        } catch (error) {
            if(botTypingIndicator) botTypingIndicator.style.display = 'none';
            console.error('sendMessage: Fetch API call failed. Error:', error);
            appendMessageToChat('Error: Could not connect to the chat service. ' + error.message, 'system-error');
        }
    };

    function appendMessageToChat(text, cssClass) {
        if (!chatMessagesContainer) return; // تأكد من وجود الحاوية
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', cssClass);
        messageDiv.textContent = text;
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    if (userInputElement) {
        userInputElement.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

// بدء حلقة الرسم للـ LIDAR
if (typeof render === 'function') {
    render();
}