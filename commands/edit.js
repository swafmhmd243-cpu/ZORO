const axios = require('axios');
const { fetchBuffer } = require('../lib/myfunc');

async function editCommand(sock, chatId, message) {
    try {
        // إرسال رسالة انتظار
        await sock.sendMessage(chatId, { 
            text: '⏳ جاري البحث عن الإيديت...' 
        }, { quoted: message });

        // الحصول على رابط عشوائي للإيديتات من API
        const apiUrl = 'https://random-anime-edits.vercel.app/random';
        
        const response = await axios.get(apiUrl);
        const editData = response.data;

        if (!editData || !editData.videoUrl) {
            throw new Error('لم يتم العثور على إيديت');
        }

        // تحميل الفيديو
        const videoBuffer = await fetchBuffer(editData.videoUrl);

        // إرسال الفيديو مع المعلومات
        const caption = `🎬 *إيديت أنمي من الإنستغرام*\n\n` +
                      `📝 *المصدر:* ${editData.source || 'غير معروف'}\n` +
                      `❤️ *الإعجابات:* ${editData.likes || 'غير معروفة'}\n` +
                      `🔗 *الرابط:* ${editData.videoUrl}`;

        await sock.sendMessage(chatId, {
            video: videoBuffer,
            caption: caption,
            gifPlayback: false,
            ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('خطأ في أمر edit:', error);
        
        // محاولة استخدام API بديل إذا فشل الأول
        try {
            await sock.sendMessage(chatId, { 
                text: '🔄 جربت استخدام مصدر بديل...' 
            }, { quoted: message });

            const alternativeApis = [
                'https://anime-edits-api.herokuapp.com/random',
                'https://api.anime