const fs = require('fs');
const path = require('path');

// قائمة الإيموجيات الممكنة
const emojiList = [
  '😀','😃','😄','😁','😆','🥹','😂','🤣','😊','😇',
  '😉','😍','😘','😚','😋','😜','😝','🤪','🤩','🥳',
  '😎','🤓','🧐','😏','😌','😴','😪','😷','🤒','🤕',
  '🤢','🤮','🤧','🥶','🥵','🥱','😤','😡','😠','🤬',
  '😈','👿','💀','☠️','👻','👽','🤖','💩','🤡','😺',
  '😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉',
  '🙊','💋','💌','💘','💝','💖','💗','💓','💞','💕',
  '💟','❣️','💔','❤️‍🔥','❤️‍🩹','❤️','🧡','💛','💚','💙',
  '💜','🤎','🖤','🤍','💯','💫','⭐','🌟','✨','⚡',
  '🔥','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️',
  '🌩️','🌨️','❄️','☃️','⛄','💧','💦','🌊','🎉','🎊'
];

// مسار ملف حالة التفاعل
const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// تحميل حالة auto-reaction
function loadAutoReactionState() {
    try {
        if (fs.existsSync(USER_GROUP_DATA)) {
            const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));
            return data.autoReaction || false;
        }
    } catch (error) {
        console.error('Error loading auto-reaction state:', error);
    }
    return false;
}

// حفظ حالة auto-reaction
function saveAutoReactionState(state) {
    try {
        const data = fs.existsSync(USER_GROUP_DATA)
            ? JSON.parse(fs.readFileSync(USER_GROUP_DATA))
            : { groups: [], chatbot: {} };
        data.autoReaction = state;
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving auto-reaction state:', error);
    }
}

// تخزين الحالة في الذاكرة
let isAutoReactionEnabled = loadAutoReactionState();

// 🔹 تفاعل تلقائي على كل رسالة
async function handleAutoReactionOnAllMessages(sock, message) {
    try {
        if (!isAutoReactionEnabled || !message?.key?.id) return;
        const chatId = message.key.remoteJid;
        const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
        await sock.sendMessage(chatId, {
            react: {
                text: emoji,
                key: message.key
            }
        });
    } catch (error) {
        console.error('Error auto-reacting to message:', error);
    }
}

// 🔸 أمر التحكم .autoreact on/off
async function handleAreactCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!',
                quoted: message
            });
            return;
        }

        const args = message.message?.conversation?.split(' ') || [];
        const action = args[1]?.toLowerCase();

        if (action === 'on') {
            isAutoReactionEnabled = true;
            saveAutoReactionState(true);
            await sock.sendMessage(chatId, { text: '✅ Auto-reactions have been enabled for all messages', quoted: message });
        } else if (action === 'off') {
            isAutoReactionEnabled = false;
            saveAutoReactionState(false);
            await sock.sendMessage(chatId, { text: '✅ Auto-reactions have been disabled', quoted: message });
        } else {
            const currentState = isAutoReactionEnabled ? 'enabled' : 'disabled';
            await sock.sendMessage(chatId, {
                text: `Auto-reactions are currently ${currentState}.\n\nUse:\n.autoreact on - Enable reactions on all messages\n.autoreact off - Disable it.`,
                quoted: message
            });
        }
    } catch (error) {
        console.error('Error handling autoreact command:', error);
        await sock.sendMessage(chatId, { text: '❌ Error controlling auto-reactions', quoted: message });
    }
}

function isAutoReactOn() {
    return isAutoReactionEnabled;
}

module.exports = {
    handleAreactCommand,
    handleAutoReactionOnAllMessages,
    isAutoReactOn
};