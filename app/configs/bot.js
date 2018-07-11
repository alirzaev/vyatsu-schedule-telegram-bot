const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TG_BOT_TOKEN;
const PORT = process.env.PORT;
const URL = process.env.URL;

const bot = new TelegramBot(TOKEN, {
    webHook: {
        port: PORT || 8080
    }
});

module.exports = {
    initialize: async () => {
        await bot.setWebHook(`${URL}${TOKEN}`);
    },

    instance: () => {
        return bot;
    }
};
