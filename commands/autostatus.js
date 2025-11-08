const fs = require('fs');
const path = require('path');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter',
            newsletterName: 'ZORO Bot',
            serverMessageId: -1
        }
    }
};

// مسار تخزين إعدادات الحالة التلقائية
const configPath = path.join(__dirname, '../data/autoStatus.json');

// تهيئة ملف الإعدادات إذا لم يكن موجوداً
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        enabled: false, 
        reactOn: false 
    }));
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        // التحقق مما إذا كان المرسل هو المالك
        if (!msg.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ هذا الأمر يمكن استخدامه فقط من قبل مالك البوت!',
                ...channelInfo
            });
            return;
        }

        // قراءة الإعدادات الحالية
        let config = JSON.parse(fs.readFileSync(configPath));

        // إذا لم تكن هناك وسائط، عرض الحالة الحالية
        if (!args || args.length === 0) {
            const status = config.enabled ? 'مفعل' : 'معطل';
            const reactStatus = config.reactOn ? 'مفعل' : 'معطل';
            await sock.sendMessage(chatId, { 
                text: `🔄 *إعدادات الحالة التلقائية - ZORO*\n\n📱 *عرض الحالة التلقائي:* ${status}\n💫 *ردود فعل الحالة:* ${reactStatus}\n\n*الأوامر:*\n.autostatus on - تفعيل عرض الحالة التلقائي\n.autostatus off - إيقاف عرض الحالة التلقائي\n.autostatus react on - تفعيل ردود فعل الحالة\n.autostatus react off - إيقاف ردود فعل الحالة`,
                ...channelInfo
            });
            return;
        }

        // التعامل مع أوامر التشغيل/الإيقاف
        const command = args[0].toLowerCase();
        
        if (command === 'on') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text: '✅ تم تفعيل عرض الحالة التلقائي! - ZORO\nالبوت سيعرض الآن جميع حالات الاتصال تلقائياً.',
                ...channelInfo
            });
        } else if (command === 'off') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text: '❌ تم إيقاف عرض الحالة التلقائي! - ZORO\nالبوت لن يعرض الحالات تلقائياً بعد الآن.',
                ...channelInfo
            });
        } else if (command === 'react') {
            // التعامل مع الأمر الفرعي للردود
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❌ يرجى تحديد on/off للردود!\nاستخدم: .autostatus react on/off',
                    ...channelInfo
                });
                return;
            }
            
            const reactCommand = args[1].toLowerCase();
            if (reactCommand === 'on') {
                config.reactOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text: '💫 تم تفعيل ردود فعل الحالة! - ZORO\nالبوت سيرد الآن على تحديثات الحالة.',
                    ...channelInfo
                });
            } else if (reactCommand === 'off') {
                config.reactOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text: '❌ تم إيقاف ردود فعل الحالة! - ZORO\nالبوت لن يرد على تحديثات الحالة بعد الآن.',
                    ...channelInfo
                });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ أمر رد غير صالح! استخدم: .autostatus react on/off',
                    ...channelInfo
                });
            }
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ أمر غير صالح! استخدم:\n.autostatus on/off - تفعيل/إيقاف عرض الحالة التلقائي\n.autostatus react on/off - تفعيل/إيقاف ردود فعل الحالة',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('خطأ في أمر الحالة التلقائية:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ حدث خطأ أثناء إدارة الحالة التلقائية!\n' + error.message,
            ...channelInfo
        });
    }
}

// دالة للتحقق مما إذا كانت الحالة التلقائية مفعلة
function isAutoStatusEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.enabled;
    } catch (error) {
        console.error('خطأ في التحقق من إعدادات الحالة التلقائية:', error);
        return false;
    }
}

// دالة للتحقق مما إذا كانت ردود فعل الحالة مفعلة
function isStatusReactionEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.reactOn;
    } catch (error) {
        console.error('خطأ في التحقق من إعدادات ردود فعل الحالة:', error);
        return false;
    }
}

// دالة للرد على الحالة باستخدام الطريقة المناسبة
async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled()) {
            return;
        }

        // استخدام طريقة relayMessage المناسبة لردود فعل الحالة
        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '💚'
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
        
        // تم إزالة سجل النجاح - الاحتفاظ بالأخطاء فقط
    } catch (error) {
        console.error('❌ خطأ في الرد على الحالة:', error.message);
    }
}

// دالة للتعامل مع تحديثات الحالة
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) {
            return;
        }

        // إضافة تأخير لمنع تجاوز الحد المسموح
        await new Promise(resolve => setTimeout(resolve, 1000));

        // التعامل مع الحالة من messages.upsert
        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    await sock.readMessages([msg.key]);
                    const sender = msg.key.participant || msg.key.remoteJid;
                    
                    // الرد على الحالة إذا كانت مفعلة
                    await reactToStatus(sock, msg.key);
                    
                    // تم إزالة سجل النجاح - الاحتفاظ بالأخطاء فقط
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        console.log('⚠️ تم الوصول للحد المسموح، الانتظار قبل إعادة المحاولة...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await sock.readMessages([msg.key]);
                    } else {
                        throw err;
                    }
                }
                return;
            }
        }

        // التعامل مع تحديثات الحالة المباشرة
        if (status.key && status.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.key]);
                const sender = status.key.participant || status.key.remoteJid;
                
                // الرد على الحالة إذا كانت مفعلة
                await reactToStatus(sock, status.key);
                
                // تم إزالة سجل النجاح - الاحتفاظ بالأخطاء فقط
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ تم الوصول للحد المسموح، الانتظار قبل إعادة المحاولة...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

        // التعامل مع الحالة في الردود
        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.reaction.key]);
                const sender = status.reaction.key.participant || status.reaction.key.remoteJid;
                
                // الرد على الحالة إذا كانت مفعلة
                await reactToStatus(sock, status.reaction.key);
                
                // تم إزالة سجل النجاح - الاحتفاظ بالأخطاء فقط
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ تم الوصول للحد المسموح، الانتظار قبل إعادة المحاولة...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.reaction.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

    } catch (error) {
        console.error('❌ خطأ في عرض الحالة التلقائي:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};