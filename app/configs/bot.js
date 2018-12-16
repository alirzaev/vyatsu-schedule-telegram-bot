const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const bot = new TelegramBot(TOKEN, {
    webHook: {
        port: PORT || 8080
    }
});

module.exports = {
    initialize: async () => {
        await bot.setWebHook(`${WEBHOOK_URL}${TOKEN}`);
    },

    instance: () => {
        return bot;
    }
};
