const settings = require("../settings");
async function aliveCommand(sock, chatId, message) {
    try {
        const message1 = `*🤖 بوت ZORO نشط!*\n\n` +
                       `*الإصدار:* ${settings.version}\n` +
                       `*الحالة:* متصل\n` +
                       `*الوضع:* عام\n\n` +
                       `*🌟 المميزات:*\n` +
                       `• إدارة المجموعات\n` +
                       `• حماية ضد الروابط\n` +
                       `• أوامر ترفيهية\n` +
                       `• والمزيد!\n\n` +
                       `اكتب *.menu* لرؤية قائمة الأوامر الكاملة`;

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'ZORO Bot',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    } catch (error) {
        console.error('خطأ في أمر alive:', error);
        await sock.sendMessage(chatId, { text: 'البوت نشط ويعمل!' }, { quoted: message });
    }
}

module.exports = aliveCommand;