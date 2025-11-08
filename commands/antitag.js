const { setAntitag, getAntitag, removeAntitag } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```للمشرفين فقط!```' },{quoted :message});
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ZORO - إعدادات منع التاغ\n\n${prefix}antitag on\n${prefix}antitag set delete | kick\n${prefix}antitag off\n\nبواسطة ZORO\`\`\``;
            await sock.sendMessage(chatId, { text: usage },{quoted :message});
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntitag(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_منع التاغ مفعل بالفعل_*' },{quoted :message});
                    return;
                }
                const result = await setAntitag(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '*_تم تفعيل منع التاغ_* - ZORO' : '*_فشل في تفعيل منع التاغ_*' 
                },{quoted :message});
                break;

            case 'off':
                await removeAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_تم إيقاف منع التاغ_* - ZORO' },{quoted :message});
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_يرجى تحديد الإجراء: ${prefix}antitag set delete | kick_*` 
                    },{quoted :message});
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_إجراء غير صالح. اختر delete أو kick._*' 
                    },{quoted :message});
                    return;
                }
                const setResult = await setAntitag(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? `*_تم تعيين إجراء منع التاغ إلى ${setAction}_* - ZORO` : '*_فشل في تعيين إجراء منع التاغ_*' 
                },{quoted :message});
                break;

            case 'get':
                const status = await getAntitag(chatId, 'on');
                const actionConfig = await getAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*_إعدادات منع التاغ:_*\nالحالة: ${status ? 'مفعل' : 'معطل'}\nالإجراء: ${actionConfig ? actionConfig.action : 'غير محدد'}\n\nZORO` 
                },{quoted :message});
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_استخدم ${prefix}antitag لرؤية التعليمات._*` },{quoted :message});
        }
    } catch (error) {
        console.error('خطأ في أمر منع التاغ:', error);
        await sock.sendMessage(chatId, { text: '*_خطأ في معالجة أمر منع التاغ_*' },{quoted :message});
    }
}

async function handleTagDetection(sock, chatId, message, senderId) {
    try {
        const antitagSetting = await getAntitag(chatId, 'on');
        if (!antitagSetting || !antitagSetting.enabled) return;

        // التحقق مما إذا كانت الرسالة تحتوي على إشارات
        const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || 
                        message.message?.conversation?.match(/@\d+/g) ||
                        [];

        // التحقق مما إذا كانت رسالة مجموعة ولها إشارات متعددة
        if (mentions.length > 0 && mentions.length >= 3) {
            // الحصول على أعضاء المجموعة للتحقق مما إذا كان تاغ للجميع
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants || [];
            
            // إذا كانت الإشارات أكثر من 50% من أعضاء المجموعة، اعتبرها تاغ للجميع
            const mentionThreshold = Math.ceil(participants.length * 0.5);
            
            if (mentions.length >= mentionThreshold) {
                
                const action = antitagSetting.action || 'delete';
                
                if (action === 'delete') {
                    // حذف الرسالة
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: message.key.id,
                            participant: senderId
                        }
                    });
                    
                    // إرسال تحذير
                    await sock.sendMessage(chatId, {
                        text: `⚠️ *تم كشف تاغ للجميع!* - ZORO`
                    }, { quoted: message });
                    
                } else if (action === 'kick') {
                    // أولاً حذف الرسالة
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: message.key.id,
                            participant: senderId
                        }
                    });

                    // ثم طرد المستخدم
                    await sock.groupParticipantsUpdate(chatId, [senderId], "remove");

                    // إرسال إشعار
                    const usernames = [`@${senderId.split('@')[0]}`];
                    await sock.sendMessage(chatId, {
                        text: `🚫 *تم كشف منع التاغ!*\n\n${usernames.join(', ')} تم طرده لتاغ جميع الأعضاء. - ZORO`,
                        mentions: [senderId]
                    }, { quoted: message });
                }
            }
        }
    } catch (error) {
        console.error('خطأ في كشف التاغ:', error);
    }
}

module.exports = {
    handleAntitagCommand,
    handleTagDetection
};