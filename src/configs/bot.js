const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

let bot = null;

module.exports = {
    initialize: async () => {
        const options = {};
        if (WEBHOOK_URL) {
            options.webHook = {
                port: PORT || 80,
                autoOpen: false
            };
        } else {
            options.polling = {
                autoStart: false,
                params: {
                    timeout: 10
                }
            };
        }

        bot = new TelegramBot(TOKEN, options);
    },

    instance: () => {
        if (bot) {
            return bot;
        } else {
            throw new Error('Bot is not initialized');
        }
    },

    start: async () => {
        if (WEBHOOK_URL) {
            await bot.openWebHook();
            const normalizedUrl = WEBHOOK_URL.endsWith('/') ? WEBHOOK_URL : WEBHOOK_URL + '/';
            await bot.setWebHook(`${normalizedUrl}${TOKEN}`);
        } else {
            await bot.startPolling();
        }
    }
};
