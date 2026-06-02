const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const axios = require('axios');

// Initialize the WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu'
        ]
    }
});

// Generate and save QR code as image, and print to terminal (for Render logs)
client.on('qr', (qr) => {
    console.log('\n=========================================');
    console.log('סרוק את הברקוד הבא כדי לחבר את הבוט:');
    console.log('=========================================\n');
    
    // Print to terminal for Render/Linux
    qrcodeTerminal.generate(qr, {small: false});
    
    // Also save as image locally for Windows fallback
    QRCode.toFile('qr.png', qr, {
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (err) {
        if (!err) console.log('קובץ גיבוי qr.png נוצר בהצלחה.');
    });
});

// Confirmation when successfully authenticated
client.on('authenticated', () => {
    console.log('\n✅ הברקוד נסרק בהצלחה! כעת מסנכרן הודעות (זה עשוי לקחת כמה דקות בטלפון ראשי)...');
});

async function handleIncomingMessage(message) {
    // Only process standard text messages
    if (message.type !== 'chat') return;
    
    const chat = await message.getChat();
    
    let textToSend = message.body;
    
    // In groups, only reply if the bot is explicitly mentioned
    if (chat.isGroup) {
        const mentions = await message.getMentions();
        // Check if the bot's own ID is in the mentions list
        const isMentioned = mentions.some(contact => contact.id._serialized === client.info.wid._serialized);
        
        if (!isMentioned) {
            return; // Ignore group messages that don't tag the bot
        }
        
        // Remove ALL mentions from the text so the AI doesn't get confused by "@508..."
        textToSend = textToSend.replace(/@\d+\s*/g, '').trim();
    }

    console.log(`📩 הודעה חדשה מ-${message.from}: ${message.body}`);
    
    try {
        // Show "typing..." in WhatsApp
        chat.sendStateTyping();

        // Send the message text and sender ID to our Python backend
        const apiPort = process.env.PORT || 5000;
        const response = await axios.post(`http://127.0.0.1:${apiPort}/api/chat`, {
            phone: message.from,
            text: textToSend
        }, {
            timeout: 60000 // Give the AI up to 60 seconds to respond
        });

        const replyText = response.data.response;
        
        // Stop typing indicator and send the actual reply
        chat.clearState();
        if (replyText) {
            await client.sendMessage(message.from, replyText);
            console.log(`✅ תשובה נשלחה בהצלחה.`);
            
            // Auto-archive private chats so they don't clutter the user's inbox
            if (!chat.isGroup) {
                try {
                    await chat.archive();
                    console.log(`🗃️ צ'אט הועבר לארכיון.`);
                } catch (err) {
                    console.log(`⚠️ שגיאה בהעברת הצ'אט לארכיון: ${err.message}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ שגיאה בתקשורת עם השרת של פייתון:', error.message);
        chat.clearState();
        client.sendMessage(message.from, '⚠️ מצטער, נראה שיש לי תקלה זמנית. אנא נסה שוב מאוחר יותר.');
    }
}

// Listen to incoming messages
client.on('message', async (message) => {
    await handleIncomingMessage(message);
});

// Confirmation when successfully connected
client.on('ready', async () => {
    console.log('\n✅ הלקוח מחובר בהצלחה לווצאפ!');
    console.log('בוט הווצאפ שלך מוכן ופועל באוויר...');
    
    console.log('בודק אם יש הודעות שלא נקראו בזמן שהייתי כבוי...');
    try {
        const chats = await client.getChats();
        let unreadFound = false;
        
        for (const chat of chats) {
            if (chat.unreadCount > 0) {
                unreadFound = true;
                const messages = await chat.fetchMessages({ limit: chat.unreadCount });
                for (const msg of messages) {
                    // Ignore messages sent by ourselves
                    if (!msg.fromMe) {
                        await handleIncomingMessage(msg);
                    }
                }
                // Mark chat as read
                await chat.sendSeen();
            }
        }
        
        if (!unreadFound) {
            console.log('אין הודעות חדשות להשלים.');
        } else {
            console.log('סיימתי לטפל בכל ההודעות שהמתינו.');
        }
        
        // Proactive message to Yosef Cohen
        console.log('מחפש את יוסף כהן כדי לשלוח הודעה יזומה...');
        const contacts = await client.getContacts();
        const targetContact = contacts.find(c => (c.name && c.name.includes('יוסף כהן')) || (c.number && c.number.endsWith('4333')));
        if (targetContact) {
            console.log('יוסף כהן נמצא! בודק אם כבר נשלחה לו ההודעה...');
            const targetChat = await targetContact.getChat();
            const msgs = await targetChat.fetchMessages({ limit: 20 });
            const greeting = "שלום! אני FixyBot 🛠️ — בוט תמיכה טכנית מקצועי. אני כאן כדי לעזור לך עם כל בעיה טכנולוגית שיש לך. איך אוכל לעזור לך היום? 😊";
            const alreadySent = msgs.some(m => m.fromMe && m.body === greeting);
            
            if (!alreadySent) {
                await client.sendMessage(targetContact.id._serialized, greeting);
                console.log('✅ הודעת היכרות נשלחה בהצלחה ליוסף כהן!');
            } else {
                console.log('⏭️ הודעת היכרות ליוסף כהן כבר נשלחה בעבר. מדלג.');
            }
        } else {
            console.log('⚠️ לא נמצא איש קשר בשם יוסף כהן או שמסתיים ב-4333.');
        }
        
    } catch (err) {
        console.error('שגיאה בסריקת הודעות שלא נקראו:', err.message);
    }
});

// Start the client
console.log('מפעיל את שרת הגישור לווצאפ...');
client.initialize().catch(err => {
    console.error('❌ שגיאה חמורה בהפעלת הווצאפ:', err);
});
