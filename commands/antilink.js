const { bots } = require('../lib/antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```للمشرفين فقط!```' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ZORO - إعدادات منع الروابط\n\n${prefix}antilink on\n${prefix}antilink set delete | kick | warn\n${prefix}antilink off\n\nبواسطة ZORO\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_منع الروابط مفعل بالفعل_*' }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '*_تم تفعيل منع الروابط_* - ZORO' : '*_فشل في تفعيل منع الروابط_*' 
                },{ quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_تم إيقاف منع الروابط_* - ZORO' }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_يرجى تحديد الإجراء: ${prefix}antilink set delete | kick | warn_*` 
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_إجراء غير صالح. اختر delete، kick، أو warn._*' 
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? `*_تم تعيين إجراء منع الروابط إلى ${setAction}_* - ZORO` : '*_فشل في تعيين إجراء منع الروابط_*' 
                }, { quoted: message });
                break;

            case 'get':
                const status = await getAntilink(chatId, 'on');
                const actionConfig = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*_إعدادات منع الروابط:_*\nالحالة: ${status ? 'مفعل' : 'معطل'}\nالإجراء: ${actionConfig ? actionConfig.action : 'غير محدد'}\n\nZORO` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_استخدم ${prefix}antilink لرؤية التعليمات._*` });
        }
    } catch (error) {
        console.error('خطأ في أمر منع الروابط:', error);
        await sock.sendMessage(chatId, { text: '*_خطأ في معالجة أمر منع الروابط_*' });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const antilinkSetting = getAntilinkSetting(chatId);
    if (antilinkSetting === 'off') return;

    console.log(`إعداد منع الروابط للمجموعة ${chatId}: ${antilinkSetting}`);
    console.log(`فحص الرسالة للبحث عن روابط: ${userMessage}`);
    
    // تسجيل كائن الرسالة الكامل لتشخيص الهيكل
    console.log("كائن الرسالة الكامل: ", JSON.stringify(message, null, 2));

    let shouldDelete = false;

    const linkPatterns = {
        whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/,
        whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/,
        telegram: /t\.me\/[A-Za-z0-9_]+/,
        allLinks: /https?:\/\/[^\s]+/,
    };

    // كشف روابط مجموعات الواتساب
    if (antilinkSetting === 'whatsappGroup') {
        console.log('حماية روابط مجموعات الواتساب مفعلة.');
        if (linkPatterns.whatsappGroup.test(userMessage)) {
            console.log('تم كشف رابط مجموعة واتساب!');
            shouldDelete = true;
        }
    } else if (antilinkSetting === 'whatsappChannel' && linkPatterns.whatsappChannel.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'telegram' && linkPatterns.telegram.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'allLinks' && linkPatterns.allLinks.test(userMessage)) {
        shouldDelete = true;
    }

    if (shouldDelete) {
        const quotedMessageId = message.key.id; // الحصول على معرف الرسالة للحذف
        const quotedParticipant = message.key.participant || senderId; // الحصول على معرف المشارك

        console.log(`محاولة حذف الرسالة بالمعرف: ${quotedMessageId} من المشارك: ${quotedParticipant}`);

        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
            });
            console.log(`تم حذف الرسالة بالمعرف ${quotedMessageId} بنجاح.`);
        } catch (error) {
            console.error('فشل في حذف الرسالة:', error);
        }

        const mentionedJidList = [senderId];
        await sock.sendMessage(chatId, { text: `تحذير! @${senderId.split('@')[0]}, نشر الروابط غير مسموح. - ZORO`, mentions: mentionedJidList });
    } else {
        console.log('لم يتم كشف أي روابط أو الحماية غير مفعلة لهذا النوع من الروابط.');
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};