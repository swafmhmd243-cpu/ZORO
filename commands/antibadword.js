const { handleAntiBadwordCommand } = require('../lib/antibadword');
const isAdminHelper = require('../lib/isAdmin');

async function antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```للمشرفين فقط!```' }, { quoted: message });
            return;
        }

        // استخراج النص من الرسالة
        const text = message.message?.conversation || 
                    message.message?.extendedTextMessage?.text || '';
        const match = text.split(' ').slice(1).join(' ');

        await handleAntiBadwordCommand(sock, chatId, message, match);
    } catch (error) {
        console.error('خطأ في أمر منع الكلمات السيئة:', error);
        await sock.sendMessage(chatId, { text: '*خطأ في معالجة أمر منع الكلمات السيئة*' }, { quoted: message });
    }
}

module.exports = antibadwordCommand;