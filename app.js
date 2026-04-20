const statusDiv = document.getElementById('status');
const chatLog = document.getElementById('chat-log');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const createPanel = document.getElementById('create-panel');
const chatPanel = document.getElementById('chat-panel');

let peer = null;
let currentConn = null;
let currentRoomId = null;
let isConnected = false;

function addMessageToChat(text, isMyMessage = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  messageDiv.classList.add(isMyMessage ? 'outgoing' : 'incoming');
  messageDiv.textContent = text;
  chatLog.appendChild(messageDiv);
  messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function addSystemMessage(text) {
  const sysDiv = document.createElement('div');
  sysDiv.classList.add('system-message');
  sysDiv.textContent = text;
  chatLog.appendChild(sysDiv);
  sysDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function setControlsEnabled(enabled) {
  messageInput.disabled = !enabled;
  sendButton.disabled = !enabled;
  if (enabled) messageInput.focus();
}

function showChatPanel() {
  createPanel.classList.add('hidden');
  chatPanel.classList.remove('hidden');
}

function showCreatePanel() {
  createPanel.classList.remove('hidden');
  chatPanel.classList.add('hidden');
  setControlsEnabled(false);
  isConnected = false;
  statusDiv.innerHTML = 'не в чате';
}

async function createRoom() {
  addSystemMessage('Создание комнаты...');
  
  // Генерируем уникальный ID комнаты
  currentRoomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Создаём Peer с этим ID
  peer = new Peer(currentRoomId);
  
  peer.on('open', (id) => {
    addSystemMessage(`Комната создана! ID: ${id}`);
    statusDiv.innerHTML = `🟢 Комната: ${id.substring(0, 8)}...`;
    
    // Генерируем ссылку-приглашение
    const inviteLink = `${window.location.origin}${window.location.pathname}?room=${id}`;
    addSystemMessage(`Ссылка-приглашение: ${inviteLink}`);
    addSystemMessage('Отправьте эту ссылку другу. Как только он подключится, начнётся чат!');
    
    // Копируем ссылку в буфер обмена
    navigator.clipboard.writeText(inviteLink).then(() => {
      addSystemMessage('Ссылка скопирована в буфер обмена!');
    }).catch(() => {
      addSystemMessage('Не удалось скопировать ссылку, скопируйте вручную');
    });
    
    showChatPanel();
  });
  
  peer.on('connection', (conn) => {
    addSystemMessage('Друг подключился!');
    setupConnection(conn);
    isConnected = true;
    setControlsEnabled(true);
    statusDiv.innerHTML = '🟢 Соединено!';
  });
  
  peer.on('error', (err) => {
    console.error('Peer error:', err);
    addSystemMessage(`Ошибка: ${err.type}`);
    if (err.type === 'peer-unavailable') {
      addSystemMessage('Друг не найден. Убедитесь, что он перешёл по правильной ссылке.');
    }
  });
}

function joinRoom(roomId) {
  addSystemMessage(`Подключение к комнате ${roomId}...`);
  statusDiv.innerHTML = `🟡 Подключение...`;
  
  // Создаём Peer с случайным ID
  peer = new Peer();
  
  peer.on('open', (myId) => {
    addSystemMessage(`Ваш ID: ${myId}`);
    addSystemMessage(`Подключаемся к ${roomId}...`);
    
    // Подключаемся к хосту
    const conn = peer.connect(roomId);
    setupConnection(conn);
  });
  
  peer.on('error', (err) => {
    console.error('Peer error:', err);
    addSystemMessage(`Ошибка: ${err.type}`);
    if (err.type === 'peer-unavailable') {
      addSystemMessage('Комната не найдена. Проверьте ссылку.');
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 3000);
    }
  });
}

function setupConnection(conn) {
  currentConn = conn;
  
  conn.on('open', () => {
    addSystemMessage('Соединение установлено! Можно общаться.');
    isConnected = true;
    setControlsEnabled(true);
    statusDiv.innerHTML = '🟢 Соединено!';
    showChatPanel();
  });
  
  conn.on('data', (data) => {
    if (data.type === 'message') {
      addMessageToChat(data.text, false);
    } else if (data.type === 'system') {
      addSystemMessage(data.text);
    }
  });
  
  conn.on('close', () => {
    addSystemMessage('Соединение разорвано.');
    isConnected = false;
    setControlsEnabled(false);
    statusDiv.innerHTML = 'не в чате';
    showCreatePanel();
  });
  
  conn.on('error', (err) => {
    console.error('Connection error:', err);
    addSystemMessage(`Ошибка соединения: ${err.message}`);
  });
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (text && currentConn && currentConn.open && isConnected) {
    currentConn.send({ type: 'message', text });
    addMessageToChat(text, true);
    messageInput.value = '';
    messageInput.focus();
  } else if (!isConnected) {
    addSystemMessage('⚠️ Нет соединения с собеседником');
  } else if (!currentConn || !currentConn.open) {
    addSystemMessage('⚠️ Соединение потеряно. Создайте новую комнату.');
  }
}

document.getElementById('create-room-btn').addEventListener('click', createRoom);
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !sendButton.disabled) sendMessage();
});

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
if (roomId) {
  joinRoom(roomId);
  showChatPanel();
} else {
  showCreatePanel();
}
