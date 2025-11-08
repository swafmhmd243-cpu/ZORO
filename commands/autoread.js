/**
 * ZORO Bot - بوت واتساب
 * أمر القراءة التلقائية - قراءة جميع الرسائل تلقائياً
 */

const fs = require('fs');
const path = require('path');

// مسار تخزين الإعدادات
const configPath = path.join(__dirname, '..', 'data', 'autoread.json');

// تهيئة ملف الإعدادات إذا لم يكن موجوداً
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// تبديل خاصية القراءة التلقائية
async function autoreadCommand(sock, chatId, message) {
    try {
        // التحقق مما إذا كان المرسل هو المالك (البوت نفسه)
        if (!message.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: '❌ هذا الأمر متاح فقط لمالك البوت!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: 'ZORO Bot',
                        serverMessageId: -1
                    }
                }
            });
            return;
        }

        // الحصول على وسائط الأمر
        const args = message.message?.conversation?.trim().split(' ').slice(1) || 
                    message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) || 
                    [];
        
        // تهيئة أو قراءة الإعدادات
        const config = initConfig();
        
        // التبديل بناءً على الوسيط أو تبديل الحالة الحالية إذا لم يكن هناك وسيط
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ خيار غير صالح! استخدم: .autoread on/off',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363161513685998@newsletter',
                            newsletterName: 'ZORO Bot',
                            serverMessageId: -1
                        }
                    }
                });
                return;
            }
        } else {
            // تبديل الحالة الحالية
            config.enabled = !config.enabled;
        }
        
        // حفظ الإعدادات المحدثة
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // إرسال رسالة التأكيد
        await sock.sendMessage(chatId, {
            text: `✅ تم ${config.enabled ? 'تفعيل' : 'إيقاف'} القراءة التلقائية! - ZORO`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'ZORO Bot',
                    serverMessageId: -1
                }
            }
        });
        
    } catch (error) {
        console.error('خطأ في أمر القراءة التلقائية:', error);
        await sock.sendMessage(chatId, {
            text: '❌ خطأ في معالجة الأمر!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'ZORO Bot',
                    serverMessageId: -1
                }
            }
        });
    }
}

// دالة للتحقق مما إذا كانت القراءة التلقائية مفعلة
function isAutoreadEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('خطأ في التحقق من حالة القراءة التلقائية:', error);
        return false;
    }
}

// دالة للتحقق مما إذا تم ذكر البوت في الرسالة
function isBotMentionedInMessage(message, botNumber) {
    if (!message.message) return false;
    
    // التحقق من الإشارات في contextInfo (يعمل لجميع أنواع الرسائل)
    const messageTypes = [
        'extendedTextMessage', 'imageMessage', 'videoMessage', 'stickerMessage',
        'documentMessage', 'audioMessage', 'contactMessage', 'locationMessage'
    ];
    
    // التحقق من الإشارات الصريحة في مصفوفة mentionedJid
    for (const type of messageTypes) {
        if (message.message[type]?.contextInfo?.mentionedJid) {
            const mentionedJid = message.message[type].contextInfo.mentionedJid;
            if (mentionedJid.some(jid => jid === botNumber)) {
                return true;
            }
        }
    }
    
    // التحقق من الإشارات النصية في أنواع الرسائل المختلفة
    const textContent = 
        message.message.conversation || 
        message.message.extendedTextMessage?.text ||
        message.message.imageMessage?.caption ||
        message.message.videoMessage?.caption || '';
    
    if (textContent) {
        // التحقق من صيغة @mention
        const botUsername = botNumber.split('@')[0];
        if (textContent.includes(`@${botUsername}`)) {
            return true;
        }
        
        // التحقق من أسماء البوت (اختياري، يمكن تخصيصه)
        const botNames = [global.botname?.toLowerCase(), 'bot', 'zoro', 'zoro bot'];
        const words = textContent.toLowerCase().split(/\s+/);
        if (botNames.some(name => words.includes(name))) {
            return true;
        }
    }
    
    return false;
}

// دالة للتعامل مع وظيفة القراءة التلقائية
async function handleAutoread(sock, message) {
    if (isAutoreadEnabled()) {
        // الحصول على معرف البوت
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        // التحقق مما إذا تم ذكر البوت
        const isBotMentioned = isBotMentionedInMessage(message, botNumber);
        
        // إذا تم ذكر البوت، اقرأ الرسالة داخلياً ولكن لا تعلمها كمقروءة في الواجهة
        if (isBotMentioned) {
            
            // لا نستدعي sock.readMessages() هنا، لذا تبقى الرسالة غير مقروءة في الواجهة
            return false; // يشير إلى أن الرسالة لم تعلم كمقروءة
        } else {
            // للرسائل العادية، علم كمقروءة بشكل طبيعي
            const key = { remoteJid: message.key.remoteJid, id: message.key.id, participant: message.key.participant };
            await sock.readMessages([key]);
            //console.log('✅ تم تعليم الرسالة كمقروءة من ' + (message.key.participant || message.key.remoteJid).split('@')[0]);
            return true; // يشير إلى أن الرسالة علمت كمقروءة
        }
    }
    return false; // القراءة التلقائية معطلة
}

module.exports = {
    autoreadCommand,
    isAutoreadEnabled,
    isBotMentionedInMessage,
    handleAutoread
};