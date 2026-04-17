const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();

// 1. PORT FIX (Railway compatible)
const PORT = process.env.PORT || 8080;

// 2. MIDDLEWARE
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. ROUTES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/status', (req, res) => {
    res.send('✅ Waafi Server is Live!');
});

// 4. BOT SETUP SAFETY CHECK
if (!process.env.BOT_TOKEN) {
    console.error("❌ BOT_TOKEN is missing in .env");
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// 5. START COMMAND (FIXED inline keyboard)
bot.start((ctx) => {
    ctx.reply('Ku soo dhowaad Waafi Amaah!', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "💰 Codso Amaah",
                        web_app: {
                            url: "https://your-domain.com" // CHANGE THIS
                        }
                    }
                ]
            ]
        }
    });
});

// 6. LOAN APPLICATION API
app.post('/apply-loan', async (req, res) => {
    try {
        const { amount, duration, userId } = req.body;

        if (!amount || !duration || !userId) {
            return res.status(400).json({
                success: false,
                message: "Missing fields"
            });
        }

        console.log(`📥 Codsi Cusub: User ${userId} | Amount: ${amount} | Duration: ${duration}`);

        return res.status(200).json({
            success: true,
            message: "Codsiga waa la helay!"
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        return res.status(500).json({ success: false });
    }
});

// 7. START SERVER (Railway requires 0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server active on port ${PORT}`);

    bot.launch()
        .then(() => console.log("🤖 Bot is active"))
        .catch(err => console.error("❌ Bot error:", err));
});

// 8. Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
