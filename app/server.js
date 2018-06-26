const Redis = require('redis');
const logger = require('log4js').getLogger();
const TelegramBot = require('node-telegram-bot-api');
const Promise = require("bluebird");
const axios = require('axios');

const ENV = process.env.NODE_ENV || 'development';
const TOKEN = process.env.TG_BOT_TOKEN;
const URL = process.env.URL;

const msgs = require('./messages');

// Logger
logger.level = 'debug';

// Redis
Promise.promisifyAll(Redis.RedisClient.prototype);
Promise.promisifyAll(Redis.Multi.prototype);
const redis = Redis.createClient(process.env.REDIS_URL);
redis.on("error", function (err) {
  logger.error("Error " + err)
});

// Telegram bot
const bot = new TelegramBot(TOKEN, { 
  webHook: {
    port: process.env.PORT || 8080
  }
});
bot.setWebHook(`${URL}${TOKEN}`);

// Save all needed dependencies to ctx
const ctx = { logger, redis, bot, axios };
const { rings, chooseGroup, link, schedule, processCallback } = require('./handlers')(ctx);

// Logging
bot.on('message', (msg) => {
  logger.info(`From: ${msg.from.id}:${msg.from.username}; Message: ${msg.text}`)
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
bot.onText(/^\/rings$/i, (msg) => {
  rings(msg)
});

// Memorize group
bot.onText(/^\/group$/i, (msg) => {
  chooseGroup(msg)
});

// Schedule url
bot.onText(/^\/link$/i, (msg) => {
  link(msg)
});

// Schedule
bot.onText(/^\/schedule$/i, (msg) => {
  schedule(msg)
});

bot.on('callback_query', (msg) => {
  processCallback(msg)
});
