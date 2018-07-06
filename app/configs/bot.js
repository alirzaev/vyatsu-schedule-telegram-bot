const TelegramBot = require('node-telegram-bot-api');
const {getLogger} = require('./logging');

const TOKEN = process.env.TG_BOT_TOKEN;
const PORT = process.env.PORT;
const URL = process.env.URL;

const logger = getLogger('bot');

const bot = new TelegramBot(TOKEN, {
    webHook: {
        port: PORT || 8080
    }
});

bot
    .setWebHook(`${URL}${TOKEN}`)
    .then(() => {
        logger.info('Successfully set web hook');
    })
    .catch(error => {
        logger.error('Error when setting web hook');
        logger.error(error);
    });

module.exports = bot;
