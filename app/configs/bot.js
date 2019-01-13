const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const options = {};

if (WEBHOOK_URL) {
    options.webHook = {
        port: PORT || 80
    };
} else {
    options.polling = {
        params: {
            timeout: 10
        }
    };
}

const bot = new TelegramBot(TOKEN, options);

module.exports = {
    initialize: async () => {
        if (WEBHOOK_URL) {
            await bot.setWebHook(`${WEBHOOK_URL}${TOKEN}`);
        }
    },

    instance: () => {
        return bot;
    }
};
