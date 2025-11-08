/**
 * زورو بوت - بوت واتساب
 * حقوق النشر (c) 2024 زورو
 */
console.log('🚀 بدء تشغيل زورو بوت...');

// بدائل للمكتبات غير المثبتة
const fs = require('fs');
const path = require('path');

// بديل chalk
let chalk;
try {
    chalk = require('chalk');
} catch (error) {
    console.log('⚠️ chalk غير مثبت، استخدام بديل محلي');
    chalk = {
        red: (t) => `🔴 ${t}`,
        green: (t) => `🟢 ${t}`,
        yellow: (t) => `🟡 ${t}`,
        blue: (t) => `🔵 ${t}`,
        magenta: (t) => `🟣 ${t}`,
        cyan: (t) => `⚪ ${t}`,
        bgBlack: (t) => `⚫ ${t} ⚫`,
        bgGreen: (t) => `🟩 ${t} 🟩`,
        greenBright: (t) => `💚 ${t}`,
        redBright: (t) => `💔 ${t}`,
        black: (t) => t,
        white: (t) => t,
        bold: { blue: (t) => `🔵 ${t} 🔵` }
    };
}

// بديل لـ @hapi/boom
let Boom;
try {
    const hapiBoom = require('@hapi/boom');
    Boom = hapiBoom.Boom || hapiBoom;
} catch (error) {
    console.log('⚠️ @hapi/boom غير مثبت، استخدام بديل محلي');
    class CustomBoom extends Error {
        constructor(message, statusCode = 500) {
            super(message);
            this.isBoom = true;
            this.output = {
                statusCode: statusCode,
                payload: {
                    statusCode: statusCode,
                    error: this.getErrorType(statusCode),
                    message: message
                }
            };
        }
        
        getErrorType(statusCode) {
            const types = {
                400: 'Bad Request',
                401: 'Unauthorized',
                403: 'Forbidden',
                404: 'Not Found',
                500: 'Internal Server Error'
            };
            return types[statusCode] || 'Internal Server Error';
        }
    }
    Boom = CustomBoom;
}

// محاولة تحميل المكتبات الأخرى
let FileType, axios, PhoneNumber, NodeCache, pino, readline;
try {
    FileType = require('file-type');
} catch { FileType = { fromBuffer: () => Promise.resolve({ ext: 'jpg', mime: 'image/jpeg' }) }; }

try {
    axios = require('axios');
} catch { 
    axios = {
        get: () => Promise.reject(new Error('axios not installed')),
        post: () => Promise.reject(new Error('axios not installed'))
    };
}

try {
    PhoneNumber = require('awesome-phonenumber');
} catch { 
    PhoneNumber = class {
        constructor(num) { this.num = num; }
        getNumber() { return this.num; }
        isValid() { return true; }
    };
}

try {
    NodeCache = require("node-cache");
} catch { 
    NodeCache = class {
        constructor() { this.data = new Map(); }
        set(k, v) { this.data.set(k, v); }
        get(k) { return this.data.get(k); }
        del(k) { this.data.delete(k); }
        clear() { this.data.clear(); }
    };
}

try {
    pino = require("pino");
} catch { 
    pino = () => ({ 
        info: console.log, 
        error: console.error, 
        warn: console.warn,
        child: () => ({ level: 'fatal' })
    });
}

try {
    readline = require("readline");
} catch { 
    readline = {
        createInterface: () => ({
            question: (q, cb) => cb('1234567890'),
            close: () => {}
        })
    };
}

// محاولة تحميل Baileys
let baileys;
try {
    baileys = require("@whiskeysockets/baileys");
} catch (error) {
    console.error('❌ @whiskeysockets/baileys غير مثبت!');
    console.log('🔧 يرجى تشغيل: npm install @whiskeysockets/baileys');
    process.exit(1);
}

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = baileys;

// محاولة تحميل الإعدادات والمكتبات المحلية
let settings = {}, store, mainLibs;
try {
    settings = require('./settings');
} catch {
    settings = { 
        ownerNumber: "1234567890", 
        version: "1.0.0",
        storeWriteInterval: 10000 
    };
}

try {
    store = require('./lib/lightweight_store');
} catch {
    console.log('⚠️ استخدام مخزن افتراضي');
    store = {
        readFromFile: () => {},
        writeToFile: () => {},
        bind: () => {},
        contacts: {},
        loadMessage: () => Promise.resolve(null)
    };
}

try {
    mainLibs = require('./main');
} catch {
    mainLibs = {
        handleMessages: async () => {},
        handleGroupParticipantUpdate: async () => {},
        handleStatus: async () => {}
    };
}

try {
    require('./lib/exif');
} catch {
    console.log('⚠️ مكتبة exif غير متوفرة');
}

try {
    require('./lib/myfunc');
} catch {
    console.log('⚠️ مكتبة myfunc غير متوفرة');
}

// تهيئة المخزن
store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

// إعدادات البوت
let phoneNumber = "911234567890";
let owner = "1234567890";
try {
    owner = JSON.parse(fs.readFileSync('./data/owner.json', 'utf8'));
} catch {
    console.log('⚠️ استخدام رقم المالك الافتراضي');
}

global.botname = "زورو بوت";
global.themeemoji = "•";
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");

// إنشاء واجهة readline
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve));
    } else {
        return Promise.resolve(settings.ownerNumber || phoneNumber);
    }
};

async function startZoroBot() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const msgRetryCounterCache = new NodeCache();

        const ZoroBot = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid);
                let msg = await store.loadMessage(jid, key.id);
                return msg?.message || "";
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: undefined,
        });

        store.bind(ZoroBot.ev);

        // معالجة الرسائل
        ZoroBot.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await mainLibs.handleStatus(ZoroBot, chatUpdate);
                    return;
                }
                
                if (!ZoroBot.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

                try {
                    await mainLibs.handleMessages(ZoroBot, chatUpdate, true);
                } catch (err) {
                    console.error("خطأ في handleMessages:", err);
                }
            } catch (err) {
                console.error("خطأ في messages.upsert:", err);
            }
        });

        // وظائف المساعدة
        ZoroBot.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            } else return jid;
        };

        ZoroBot.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = ZoroBot.decodeJid(contact.id);
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
            }
        });

        ZoroBot.getName = (jid, withoutContact = false) => {
            let id = ZoroBot.decodeJid(jid);
            withoutContact = ZoroBot.withoutContact || withoutContact;
            let v;
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {};
                if (!(v.name || v.subject)) v = ZoroBot.groupMetadata(id) || {};
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'));
            });
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === ZoroBot.decodeJid(ZoroBot.user.id) ?
                ZoroBot.user :
                (store.contacts[id] || {});
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
        };

        ZoroBot.public = true;

        // معالجة رمز الاقتران
        if (pairingCode && !ZoroBot.authState.creds.registered) {
            if (useMobile) throw new Error('لا يمكن استخدام رمز الاقتران مع واجهة الهاتف المحمول');

            let phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`يرجى كتابة رقم واتساب الخاص بك 😍\nالتنسيق: 966512345678 (بدون + أو مسافات) : `)));
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            setTimeout(async () => {
                try {
                    let code = await ZoroBot.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(chalk.black(chalk.bgGreen(`رمز الاقتران الخاص بك : `)), chalk.black(chalk.white(code)));
                    console.log(chalk.yellow(`\nيرجى إدخال هذا الرمز في تطبيق واتساب`));
                } catch (error) {
                    console.error('خطأ في طلب رمز الاقتران:', error);
                }
            }, 3000);
        }

        // معالجة الاتصال
        ZoroBot.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection == "open") {
                console.log(chalk.green('✅ تم الاتصال بـ WhatsApp بنجاح!'));
                console.log(chalk.yellow(`🌿 البوت: ${JSON.stringify(ZoroBot.user.id, null, 2)}`));

                try {
                    const botNumber = ZoroBot.user.id.split(':')[0] + '@s.whatsapp.net';
                    await ZoroBot.sendMessage(botNumber, {
                        text: `🤖 تم توصيل البوت بنجاح!\n⏰ الوقت: ${new Date().toLocaleString()}\n✅ الحالة: متصل وجاهز!`
                    });
                } catch (e) {}

                await delay(1999);
                console.log(chalk.cyan(`\n< ============ ${global.botname} ============ >`));
                console.log(chalk.green('🤖 تم توصيل البوت بنجاح! ✅'));
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try {
                        require('fs').rmSync('./session', { recursive: true, force: true });
                    } catch { }
                    console.log(chalk.red('تم تسجيل الخروج، إعادة التشغيل...'));
                }
                startZoroBot();
            }
        });

        ZoroBot.ev.on('creds.update', saveCreds);
        ZoroBot.ev.on('group-participants.update', async (update) => {
            await mainLibs.handleGroupParticipantUpdate(ZoroBot, update);
        });

        return ZoroBot;
    } catch (error) {
        console.error('❌ خطأ في بدء البوت:', error);
        throw error;
    }
}

// تشغيل البوت
startZoroBot().catch(error => {
    console.error('🚨 خطأ فادح:', error);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('💥 استثناء غير معالج:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('💥 رفض غير معالج:', err);
});