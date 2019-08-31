const bot = require('./configs/bot');
const database = require('./configs/database');
const {getLogger} = require('./configs/logging');
const handlers = require('./handlers');

const logger = getLogger('index');

(async () => {
    // MongoDB
    await database.connect();
    logger.info('Successfully connected to database');

    // Bot
    await bot.initialize();
    logger.info('Successfully initialized bot');

    // Handlers
    await handlers.initialize();
    await handlers.setMessageHandlers(bot.instance());
    await handlers.setCallbackHandlers(bot.instance());
    logger.info('Successfully set handlers');

    await bot.start();
})()
    .then(() => {
        if (bot.instance().isPolling()) {
            logger.info('Bot started in polling mode');
        } else {
            logger.info('Bot started in webhook mode');
        }
    })
    .catch(error => {
        logger.error('Error occurred during initialization');
        logger.error(error);
    });
