const isAdmin = require('../lib/isAdmin');

async function muteCommand(sock, chatId, senderId, message, durationInMinutes) {
    

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'يرجى جعل البوت مسؤولاً أولاً.' }, { quoted: message });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'يمكن للمسؤولين فقط استخدام أمر كتم المجموعة.' }, { quoted: message });
        return;
    }

    try {
        // كتم المجموعة
        await sock.groupSettingUpdate(chatId, 'announcement');
        
        if (durationInMinutes !== undefined && durationInMinutes > 0) {
            const durationInMilliseconds = durationInMinutes * 60 * 1000;
            await sock.sendMessage(chatId, { text: `تم كتم المجموعة لمدة ${durationInMinutes} دقيقة.` }, { quoted: message });
            
            // ضبط مؤقت لإلغاء الكتم بعد المدة
            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(chatId, 'not_announcement');
                    await sock.sendMessage(chatId, { text: 'تم إلغاء كتم المجموعة.' });
                } catch (unmuteError) {
                    console.error('خطأ في إلغاء كتم المجموعة:', unmuteError);
                }
            }, durationInMilliseconds);
        } else {
            await sock.sendMessage(chatId, { text: 'تم كتم المجموعة.' }, { quoted: message });
        }
    } catch (error) {
        console.error('خطأ في كتم/إلغاء كتم المجموعة:', error);
        await sock.sendMessage(chatId, { text: 'حدث خطأ أثناء كتم/إلغاء كتم المجموعة. يرجى المحاولة مرة أخرى.' }, { quoted: message });
    }
}

module.exports = muteCommand;