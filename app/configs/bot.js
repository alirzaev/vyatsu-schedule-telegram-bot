const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TG_BOT_TOKEN;
const PORT = process.env.PORT;
const URL = process.env.URL;

const bot = new TelegramBot(TOKEN, {
    webHook: {
        port: PORT || 8080
    }
});

bot
    .setWebHook(`${URL}${TOKEN}`)
    .then(() => {
        console.log('Successfully set web hook');
    })
    .catch(error => {
        console.log('Error when setting web hook');
        console.error(error);
    });

module.exports = bot;
