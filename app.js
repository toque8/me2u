import { joinRoom } from 'trystero';

// --- Получаем элементы DOM ---
const statusDiv = document.getElementById('status');
const chatLog = document.getElementById('chat-log');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

let currentRoomId = null;
let sendMessage = null; // Функция для отправки сообщений
let isChatReady = false; // Флаг, готов ли чат к работе

// --- Функции для UI ---
function addMessageToChat(text, isMyMessage = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (isMyMessage) {
        messageDiv.classList.add('my-message');
    }
    messageDiv.textContent = text;
    chatLog.appendChild(messageDiv);
    // Автоматическая прокрутка вниз
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

// --- Основная логика чата ---
async function initChat() {
    // 1. Получаем roomId из URL или создаем новый
    const urlParams = new URLSearchParams(window.location.search);
    let roomId = urlParams.get('room');
    
    if (!roomId) {
        // Генерируем простой, но уникальный ID (4 слова, разделенных дефисом)
        roomId = `${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
        // Обновляем URL без перезагрузки страницы
        const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        window.history.pushState({}, '', newUrl);
        statusDiv.innerHTML = `🔗 Ваша ссылка для приглашения:<br><strong>${window.location.href}</strong><br>Поделитесь ею с другом.`;
    } else {
        statusDiv.innerHTML = `🔗 Подключение к комнате: <strong>${roomId}</strong><br>Ожидание собеседника...`;
    }

    currentRoomId = roomId;

    // 2. Подключаемся к комнате через Trystero (используем "supabase" стратегию)
    // Внимание: Стратегия "supabase" требует быстрой регистрации для получения анонимного ключа.
    // Для максимальной простоты и отсутствия регистрации, можно использовать "torrent".
    // Подробнее: https://github.com/dmotz/trystero?tab=readme-ov-file#strategy-comparison
    // const room = joinRoom({ appId: 'my-super-chat-app' }, roomId, 'torrent');
    const room = joinRoom({ appId: 'my-super-chat-app' }, roomId, 'torrent');
    
    addSystemMessage(`🟢 Соединение установлено. ID комнаты: ${roomId}`);

    // 3. Создаем Action для обмена сообщениями
    const [send, onMessage] = room.makeAction('chat');
    sendMessage = send; // Сохраняем функцию для отправки

    // 4. Обработка входящих сообщений
    onMessage((data, peerId) => {
        console.log(`Получено от ${peerId}:`, data);
        if (data && data.text) {
            // Проверяем, не наше ли это сообщение (обычно библиотека не отправляет его обратно)
            // Добавляем как сообщение от друга
            addMessageToChat(data.text, false);
        }
    });

    // 5. Отслеживаем подключение и отключение пиров
    room.onPeerJoin((peerId) => {
        addSystemMessage(`👤 Пользователь ${peerId.substring(0, 6)} подключился.`);
        if (!isChatReady) {
            isChatReady = true;
            setControlsEnabled(true);
            addSystemMessage('✅ Соединение установлено! Можно общаться.');
            statusDiv.innerHTML = `🟢 Соединено! Комната: <strong>${roomId}</strong>`;
        } else {
            addSystemMessage('Другой пользователь присоединился к чату.');
        }
    });

    room.onPeerLeave((peerId) => {
        addSystemMessage(`🚪 Пользователь ${peerId.substring(0, 6)} отключился.`);
        if (room.getPeers().length === 0) {
            isChatReady = false;
            setControlsEnabled(false);
            addSystemMessage('⏸️ Собеседник отключился. Ожидание повторного подключения...');
            statusDiv.innerHTML = `🔗 Ваша ссылка для приглашения:<br><strong>${window.location.href}</strong><br>Поделитесь ею с другом.`;
        }
    });
    
    // Проверяем, есть ли уже кто-то в комнате при загрузке
    setTimeout(() => {
        const peers = room.getPeers();
        if (peers && peers.length > 0) {
            addSystemMessage(`✅ Уже подключен: ${peers.length} собеседник(а).`);
            isChatReady = true;
            setControlsEnabled(true);
            statusDiv.innerHTML = `🟢 Соединено! Комната: <strong>${roomId}</strong>`;
        } else if (!roomId) {
            // Если мы создали комнату, но никого нет, просто ждем
            addSystemMessage('👋 Ожидание подключения собеседника... Поделитесь ссылкой!');
        } else {
            addSystemMessage('👋 Ожидание подключения собеседника...');
        }
    }, 1000);
}

// --- Обработчики событий ---
sendButton.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text && sendMessage && isChatReady) {
        // Отправляем сообщение
        sendMessage({ text: text });
        // Добавляем его в наш чат как "мое"
        addMessageToChat(text, true);
        messageInput.value = '';
        messageInput.focus();
    } else if (!isChatReady) {
        addSystemMessage('⚠️ Собеседник еще не подключился. Нельзя отправить сообщение.');
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !sendButton.disabled) {
        sendButton.click();
    }
});

// --- Запускаем приложение ---
initChat().catch(console.error);