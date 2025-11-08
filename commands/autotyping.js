/**
 * ZORO Bot - بوت واتساب
 * أمر الكتابة التلقائية - يظهر حالة كتابة وهمية
 */

const fs = require('fs');
const path = require('path');

// مسار تخزين الإعدادات
const configPath = path.join(__dirname, '..', 'data', 'autotyping.json');

// تهيئة ملف الإعدادات إذا لم يكن موجوداً
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// تبديل خاصية الكتابة التلقائية
async function autotypingCommand(sock, chatId, message) {
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
                    text: '❌ خيار غير صالح! استخدم: .autotyping on/off',
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
            text: `✅ تم ${config.enabled ? 'تفعيل' : 'إيقاف'} الكتابة التلقائية! - ZORO`,
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
        console.error('خطأ في أمر الكتابة التلقائية:', error);
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

// دالة للتحقق مما إذا كانت الكتابة التلقائية مفعلة
function isAutotypingEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('خطأ في التحقق من حالة الكتابة التلقائية:', error);
        return false;
    }
}

// دالة للتعامل مع الكتابة التلقائية للرسائل العادية
async function handleAutotypingForMessage(sock, chatId, userMessage) {
    if (isAutotypingEnabled()) {
        try {
            // أولاً الاشتراك في تحديثات الحالة لهذه الدردشة
            await sock.presenceSubscribe(chatId);
            
            // إرسال حالة متاح أولاً
            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // ثم إرسال حالة الكتابة
            await sock.sendPresenceUpdate('composing', chatId);
            
            // محاكاة وقت الكتابة بناءً على طول الرسالة مع زيادة الحد الأدنى للوقت
            const typingDelay = Math.max(3000, Math.min(8000, userMessage.length * 150));
            await new Promise(resolve => setTimeout(resolve, typingDelay));
            
            // إرسال الكتابة مرة أخرى لضمان بقائها مرئية
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // أخيراً إرسال حالة متوقف
            await sock.sendPresenceUpdate('paused', chatId);
            
            return true; // يشير إلى أنه تم عرض الكتابة
        } catch (error) {
            console.error('❌ خطأ في إرسال مؤشر الكتابة:', error);
            return false; // يشير إلى فشل الكتابة
        }
    }
    return false; // الكتابة التلقائية معطلة
}

// دالة للتعامل مع الكتابة التلقائية للأوامر - قبل تنفيذ الأمر (لم يعد مستخدماً)
async function handleAutotypingForCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            // أولاً الاشتراك في تحديثات الحالة لهذه الدردشة
            await sock.presenceSubscribe(chatId);
            
            // إرسال حالة متاح أولاً
            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // ثم إرسال حالة الكتابة
            await sock.sendPresenceUpdate('composing', chatId);
            
            // الحفاظ على مؤشر الكتابة نشطاً للأوامر مع زيادة المدة
            const commandTypingDelay = 3000;
            await new Promise(resolve => setTimeout(resolve, commandTypingDelay));
            
            // إرسال الكتابة مرة أخرى لضمان بقائها مرئية
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // أخيراً إرسال حالة متوقف
            await sock.sendPresenceUpdate('paused', chatId);
            
            return true; // يشير إلى أنه تم عرض الكتابة
        } catch (error) {
            console.error('❌ خطأ في إرسال مؤشر كتابة الأمر:', error);
            return false; // يشير إلى فشل الكتابة
        }
    }
    return false; // الكتابة التلقائية معطلة
}

// دالة لعرض حالة الكتابة بعد تنفيذ الأمر
async function showTypingAfterCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            // هذه الدالة تعمل بعد تنفيذ الأمر وإرسال الرد
            // لذا نحتاج فقط إلى عرض مؤشر كتابة قصير
            
            // الاشتراك في تحديثات الحالة
            await sock.presenceSubscribe(chatId);
            
            // عرض حالة الكتابة لفترة وجيزة
            await sock.sendPresenceUpdate('composing', chatId);
            
            // الحفاظ على الكتابة مرئية لفترة قصيرة
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // ثم التوقف
            await sock.sendPresenceUpdate('paused', chatId);
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في إرسال مؤشر الكتابة بعد الأمر:', error);
            return false;
        }
    }
    return false; // الكتابة التلقائية معطلة
}

module.exports = {
    autotypingCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage,
    handleAutotypingForCommand,
    showTypingAfterCommand
};