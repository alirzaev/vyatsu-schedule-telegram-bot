const bot = require('./configs/bot');
const database = require('./configs/database');
const {getLogger} = require('./configs/logging');
const handlers = require('./handlers');

const logger = getLogger('server');
const PORT = process.env.PORT;
const URL = process.env.URL;

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
})()
    .then(() => {
        logger.info(`Server started: ${URL}:${PORT}`);
    })
    .catch(error => {
        logger.error('Error occurred during initialization');
        logger.error(error);
    });
