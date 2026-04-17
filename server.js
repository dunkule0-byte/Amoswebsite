const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();

// Validate BOT TOKEN
if (!process.env.BOT_TOKEN) {
    console.error("❌ BOT_TOKEN is missing in .env file");
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html correctly from public folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle data from Telegram Web App
app.post('/apply-loan', async (req, res) => {
    try {
        const { amount, duration, userId } = req.body;

        // Basic validation
        if (!amount || !duration || !userId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        console.log(`📥 Loan Request:
        User: ${userId}
        Amount: ${amount}
        Duration: ${duration} months`);

        // TODO: Integrate Waafi API here
        // Example:
        // await axios.post('https://api.waafipay.com/...', {...})

        return res.status(200).json({
            success: true,
            message: "Application Received!"
        });

    } catch (error) {
        console.error("❌ Error processing loan:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// Start server first
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Launch Telegram bot safely
bot.launch()
    .then(() => console.log("🤖 Bot started"))
    .catch(err => console.error("Bot failed to start:", err));

// Graceful shutdown (VERY IMPORTANT)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
