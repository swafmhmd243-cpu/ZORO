const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "ما هي الأغنية التي تريد تحميلها؟"
            });
        }

        // البحث عن الأغنية
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "لم يتم العثور على أي أغاني!"
            });
        }

        // إرسال رسالة الانتظار
        await sock.sendMessage(chatId, {
            text: "_يرجى الانتظار، التحميل قيد التقدم_"
        });

        // الحصول على أول نتيجة فيديو
        const video = videos[0];
        const urlYt = video.url;

        // جلب بيانات الصوت من API
        const response = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${urlYt}`);
        const data = response.data;

        if (!data || !data.status || !data.result || !data.result.downloadUrl) {
            return await sock.sendMessage(chatId, { 
                text: "فشل في جلب الصوت من API. يرجى المحاولة مرة أخرى لاحقًا."
            });
        }

        const audioUrl = data.result.downloadUrl;
        const title = data.result.title;

        // إرسال الصوت
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: message });

    } catch (error) {
        console.error('خطأ في أمر song2:', error);
        await sock.sendMessage(chatId, { 
            text: "فشل التحميل. يرجى المحاولة مرة أخرى لاحقًا."
        });
    }
}

module.exports = playCommand;

/*مدعوم بواسطة ZORO-BOT*
*الإسناد إلى ZORO*`*/