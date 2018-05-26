const Redis = require('redis');
const logger = require('log4js').getLogger();
const TelegramBot = require('node-telegram-bot-api');
const Promise = require("bluebird");
const axios = require('axios');

const ENV = process.env.NODE_ENV || 'development';
const TOKEN = process.env.TG_BOT_TOKEN;
const URL = process.env.URL;

const msgs = require('./messages');
const keyboard = require('./keyboard');

// Logger
logger.level = 'debug';

// Redis
Promise.promisifyAll(Redis.RedisClient.prototype);
Promise.promisifyAll(Redis.Multi.prototype);
const redis = Redis.createClient(process.env.REDIS_URL);
redis.on("error", function (err) {
  logger.error("Error " + err);
});

// Telegram bot
const bot = new TelegramBot(TOKEN, { 
  webHook: {
    port: process.env.PORT || 8080
  }
});
bot.setWebHook(`${URL}${TOKEN}`);

// Save all needed dependencies to ctx
const ctx = { logger, redis, bot, axios }
const { rings, chooseGroup, link, schedule, processCallback } = require('./handlers')(ctx)
const groupsChooser = require('./groupsChooser')(ctx)

// Logging
bot.on('message', (msg) => {
  logger.info(`From: ${msg.from.id}:${msg.from.username}; Message: ${msg.text}`)
})

// Start bot
bot.onText(/\/start/, (msg, match) => {
  bot.sendMessage(msg.chat.id, msgs.help, {
    parse_mode: 'html',
    reply_markup: keyboard.standardKeyboard
  })
})

// Help
bot.onText(/^\/?(help|помощь)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, msgs.help, { parse_mode: 'HTML' });
})

// Rings
bot.onText(/^Звонки$/i, (msg, match) => {
  rings(msg, match);
})

// Memorize group
bot.onText(/^Выбрать группу$/i, (msg, match) => {
  chooseGroup(msg, match)
})

// Schedule url
bot.onText(/^На сайте$/i, (msg, match) => {
  link(msg)
})

// Schedule
bot.onText(/^Расписание$/i, (msg, match) => {
  schedule(msg)
})

bot.on('callback_query', function (msg) {
  processCallback(msg)
})
