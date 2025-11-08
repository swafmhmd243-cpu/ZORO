const fs = require('fs');
const { channelInfo } = require('../lib/messageConfig');

async function banCommand(sock, chatId, message) {
    let userToBan;
    
    // التحقق من المستخدمين المذكورين
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToBan = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // التحقق من الرسالة التي تم الرد عليها
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToBan = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToBan) {
        await sock.sendMessage(chatId, { 
            text: 'يرجى ذكر المستخدم أو الرد على رسالته للحظر!', 
            ...channelInfo 
        });
        return;
    }

    try {
        // إضافة المستخدم إلى قائمة المحظورين
        const bannedUsers = JSON.parse(fs.readFileSync('./data/banned.json'));
        if (!bannedUsers.includes(userToBan)) {
            bannedUsers.push(userToBan);
            fs.writeFileSync('./data/banned.json', JSON.stringify(bannedUsers, null, 2));
            
            await sock.sendMessage(chatId, { 
                text: `تم حظر @${userToBan.split('@')[0]} بنجاح!`,
                mentions: [userToBan],
                ...channelInfo 
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `@${userToBan.split('@')[0]} محظور بالفعل!`,
                mentions: [userToBan],
                ...channelInfo 
            });
        }
    } catch (error) {
        console.error('خطأ في أمر الحظر:', error);
        await sock.sendMessage(chatId, { text: 'فشل في حظر المستخدم!', ...channelInfo });
    }
}

module.exports = banCommand;