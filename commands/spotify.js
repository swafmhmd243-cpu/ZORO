const axios = require('axios');

async function spotifyCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const used = (rawText || '').split(/\s+/)[0] || '.spotify';
        const query = rawText.slice(used.length).trim();

        if (!query) {
            await sock.sendMessage(chatId, { text: 'الاستخدام: .spotify <أغنية/فنان/كلمات مفتاحية>\nمثال: .spotify con calma' }, { quoted: message });
            return;
        }

        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(apiUrl, { timeout: 20000, headers: { 'user-agent': 'Mozilla/5.0' } });

        if (!data?.status || !data?.result) {
            throw new Error('لا توجد نتائج من Spotify API');
        }

        const r = data.result;
        const audioUrl = r.audio;
        if (!audioUrl) {
            await sock.sendMessage(chatId, { text: 'لم يتم العثور على صوت قابل للتحميل لهذا الاستعلام.' }, { quoted: message });
            return;
        }

        const caption = `🎵 ${r.title || r.name || 'عنوان غير معروف'}\n👤 ${r.artist || ''}\n⏱ ${r.duration || ''}\n🔗 ${r.url || ''}`.trim();

         // إرسال الصورة والمعلومات كرسالة متابعة (اختياري)
         if (r.thumbnails) {
            await sock.sendMessage(chatId, { image: { url: r.thumbnails }, caption }, { quoted: message });
        } else if (caption) {
            await sock.sendMessage(chatId, { text: caption }, { quoted: message });
        }
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${(r.title || r.name || 'مقطع').replace(/[\\/:*?"<>|]/g, '')}.mp3`
        }, { quoted: message });

       

    } catch (error) {
        console.error('[SPOTIFY] خطأ:', error?.message || error);
        await sock.sendMessage(chatId, { text: 'فشل في جلب الصوت من Spotify. حاول باستعلام آخر لاحقًا.' }, { quoted: message });
    }
}

module.exports = spotifyCommand;

/*مدعوم بواسطة ZORO-BOT*
*الإسناد إلى ZORO*`*/