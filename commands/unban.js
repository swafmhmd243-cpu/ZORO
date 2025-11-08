const fs = require('fs');
const path = require('path');
const { channelInfo } = require('../lib/messageConfig');

async function unbanCommand(sock, chatId, message) {
    let userToUnban;
    
    // التحقق من المستخدمين المذكورين
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToUnban = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // التحقق من الرسالة التي تم الرد عليها
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToUnban = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToUnban) {
        await sock.sendMessage(chatId, { 
            text: 'يرجى ذكر المستخدم أو الرد على رسالته لإلغاء الحظر!', 
            ...channelInfo 
        }, { quoted: message });
        return;
    }

    try {
        const bannedUsers = JSON.parse(fs.readFileSync('./data/banned.json'));
        const index = bannedUsers.indexOf(userToUnban);
        if (index > -1) {
            bannedUsers.splice(index, 1);
            fs.writeFileSync('./data/banned.json', JSON.stringify(bannedUsers, null, 2));
            
            await sock.sendMessage(chatId, { 
                text: `تم إلغاء حظر ${userToUnban.split('@')[0]} بنجاح!`,
                mentions: [userToUnban],
                ...channelInfo 
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `${userToUnban.split('@')[0]} غير محظور!`,
                mentions: [userToUnban],
                ...channelInfo 
            });
        }
    } catch (error) {
        console.error('خطأ في أمر إلغاء الحظر:', error);
        await sock.sendMessage(chatId, { text: 'فشل في إلغاء حظر المستخدم!', ...channelInfo }, { quoted: message });
    }
}

module.exports = unbanCommand;

/*مدعوم بواسطة ZORO-BOT*
*الإسناد إلى ZORO*`*/