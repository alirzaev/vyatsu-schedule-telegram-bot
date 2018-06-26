const bot = require('./configs/bot');
const msgs = require('./messages');
const database = require('./configs/database');
const {getLogger} = require('./configs/logging');
const {rings, chooseGroup, link, schedule, processCallback} = require('./handlers');

const logger = getLogger('server');

// MongoDB
database.connect();

// Logging
bot.on('message', (msg) => {
    logger.info(`From: ${msg.from.id}:${msg.from.username}; message: ${msg.text}`)
});

// Start bot
bot.onText(/\/start/, async (msg) => {
    await bot.sendMessage(msg.chat.id, msgs.help, {
        parse_mode: 'html'
    })
});

// Help
bot.onText(/^\/help$/i, async (msg) => {
    await bot.sendMessage(msg.chat.id, msgs.help, {
        parse_mode: 'html'
    })
});

// Rings schedule
bot.onText(/^\/rings$/i, async (msg) => {
    await rings(msg)
});

// Memorize group
bot.onText(/^\/group$/i, async (msg) => {
    await chooseGroup(msg)
});

// Schedule url
bot.onText(/^\/link$/i, async (msg) => {
    await link(msg)
});

// Schedule
bot.onText(/^\/schedule$/i, async (msg) => {
    await schedule(msg)
});

bot.on('callback_query', async (msg) => {
    await processCallback(msg)
});
