const TicTacToe = require('../lib/tictactoe');

// تخزين الألعاب بشكل عام
const games = {};

async function tictactoeCommand(sock, chatId, senderId, text) {
    try {
        // التحقق إذا كان اللاعب موجود في لعبة بالفعل
        if (Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId)
        )) {
            await sock.sendMessage(chatId, { 
                text: '❌ أنت لا تزال في لعبة. اكتب *استسلام* للخروج.' 
            });
            return;
        }

        // البحث عن غرفة موجودة
        let room = Object.values(games).find(room => 
            room.state === 'WAITING' && 
            (text ? room.name === text : true)
        );

        if (room) {
            // الانضمام إلى غرفة موجودة
            room.o = chatId;
            room.game.playerO = senderId;
            room.state = 'PLAYING';

            const arr = room.game.render().map(v => ({
                'X': '❎',
                'O': '⭕',
                '1': '1️⃣',
                '2': '2️⃣',
                '3': '3️⃣',
                '4': '4️⃣',
                '5': '5️⃣',
                '6': '6️⃣',
                '7': '7️⃣',
                '8': '8️⃣',
                '9': '9️⃣',
            }[v]));

            const str = `
🎮 *بدأت لعبة XO!*

في انتظار @${room.game.currentTurn.split('@')[0]} للعب...

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6).join('')}

▢ *معرف الغرفة:* ${room.id}
▢ *القواعد:*
• اصنع 3 صفوف من الرموز عموديًا أو أفقيًا أو قطريًا للفوز
• اكتب رقم (1-9) لوضع رمزك
• اكتب *استسلام* للانسحاب
`;

            // إرسال الرسالة مرة واحدة فقط إلى المجموعة
            await sock.sendMessage(chatId, { 
                text: str,
                mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
            });

        } else {
            // إنشاء غرفة جديدة
            room = {
                id: 'tictactoe-' + (+new Date),
                x: chatId,
                o: '',
                game: new TicTacToe(senderId, 'o'),
                state: 'WAITING'
            };

            if (text) room.name = text;

            await sock.sendMessage(chatId, { 
                text: `⏳ *في انتظار الخصم*\nاكتب *.ttt ${text || ''}* للانضمام!`
            });

            games[room.id] = room;
        }

    } catch (error) {
        console.error('خطأ في أمر XO:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ خطأ في بدء اللعبة. يرجى المحاولة مرة أخرى.' 
        });
    }
}

async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {
        // البحث عن لعبة اللاعب
        const room = Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId) && 
            room.state === 'PLAYING'
        );

        if (!room) return;

        const isSurrender = /^(استسلام|surrender|give up)$/i.test(text);
        
        if (!isSurrender && !/^[1-9]$/.test(text)) return;

        // السماح بالاستسلام في أي وقت، وليس فقط خلال دور اللاعب
        if (senderId !== room.game.currentTurn && !isSurrender) {
            await sock.sendMessage(chatId, { 
                text: '❌ ليس دورك!' 
            });
            return;
        }

        let ok = isSurrender ? true : room.game.turn(
            senderId === room.game.playerO,
            parseInt(text) - 1
        );

        if (!ok) {
            await sock.sendMessage(chatId, { 
                text: '❌ حركة غير صالحة! هذا الموضع محجوز مسبقًا.' 
            });
            return;
        }

        let winner = room.game.winner;
        let isTie = room.game.turns === 9;

        const arr = room.game.render().map(v => ({
            'X': '❎',
            'O': '⭕',
            '1': '1️⃣',
            '2': '2️⃣',
            '3': '3️⃣',
            '4': '4️⃣',
            '5': '5️⃣',
            '6': '6️⃣',
            '7': '7️⃣',
            '8': '8️⃣',
            '9': '9️⃣',
        }[v]));

        if (isSurrender) {
            // تعيين الفائز كخصم اللاعب المستسلم
            winner = senderId === room.game.playerX ? room.game.playerO : room.game.playerX;
            
            // إرسال رسالة استسلام
            await sock.sendMessage(chatId, { 
                text: `🏳️ @${senderId.split('@')[0]} استسلم! @${winner.split('@')[0]} فاز باللعبة!`,
                mentions: [senderId, winner]
            });
            
            // حذف اللعبة فور الاستسلام
            delete games[room.id];
            return;
        }

        let gameStatus;
        if (winner) {
            gameStatus = `🎉 @${winner.split('@')[0]} فاز باللعبة!`;
        } else if (isTie) {
            gameStatus = `🤝 انتهت اللعبة بتعادل!`;
        } else {
            gameStatus = `🎲 الدور: @${room.game.currentTurn.split('@')[0]} (${senderId === room.game.playerX ? '❎' : '⭕'})`;
        }

        const str = `
🎮 *لعبة XO*

${gameStatus}

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6).join('')}

▢ اللاعب ❎: @${room.game.playerX.split('@')[0]}
▢ اللاعب ⭕: @${room.game.playerO.split('@')[0]}

${!winner && !isTie ? '• اكتب رقم (1-9) لتنفيذ حركتك\n• اكتب *استسلام* للانسحاب' : ''}
`;

        const mentions = [
            room.game.playerX, 
            room.game.playerO,
            ...(winner ? [winner] : [room.game.currentTurn])
        ];

        await sock.sendMessage(room.x, { 
            text: str,
            mentions: mentions
        });

        if (room.x !== room.o) {
            await sock.sendMessage(room.o, { 
                text: str,
                mentions: mentions
            });
        }

        if (winner || isTie) {
            delete games[room.id];
        }

    } catch (error) {
        console.error('خطأ في حركة XO:', error);
    }
}

module.exports = {
    tictactoeCommand,
    handleTicTacToeMove
};

/*مدعوم بواسطة ZORO-BOT*
*الإسناد إلى ZORO*`*/