const ENV = process.env.NODE_ENV || 'development';

const TOKEN = process.env.TG_BOT_TOKEN;
const URL = process.env.URL;

const msgs = require('./messages');
const keyboard = require('./keyboard');

const Promise = require("bluebird");
const axios = require('axios');

// Logger
const logger = require('log4js').getLogger();
logger.level = 'debug';

// Mongoose
require('mongoose').connect(process.env.MONGODB_URI);
const Visit = require('./models/Visit');

// Redis
const Redis = require('redis');
Promise.promisifyAll(Redis.RedisClient.prototype);
Promise.promisifyAll(Redis.Multi.prototype);
const redis = Redis.createClient(process.env.REDIS_URL);
redis.on("error", function (err) {
  logger.error("Error " + err);
});

// Telegram bot
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(TOKEN, { 
  webHook: {
    port: process.env.PORT || 8080
  }
});
bot.setWebHook(`${URL}${TOKEN}`);

// Save all needed dependencies to ctx
const ctx = { logger, redis, bot, axios }

const { rings, memorizeGroup, link, schedule } = require('./handlers')(ctx);
const { currentWeek } = require('./schedule')(ctx);

// Logging
bot.on('message', (msg) => {
  logger.info(`From: ${msg.from.id}:${msg.from.username}; Message: ${msg.text}`);
});

// Start bot
bot.onText(/\/start/, (msg, match) => {
  bot.sendMessage(msg.chat.id, msgs.help, {
    parse_mode: 'html',
    reply_markup: keyboard.standardKeyboard
  });
});

// Help
bot.onText(/^\/(help|помощь)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, msgs.help, { parse_mode: 'HTML' });
});

// Rings
bot.onText(/^\/звонки$/i, (msg, match) => {
  rings(msg, match);
});

// Week
bot.onText(/^\/неделя$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, `${currentWeek(new Date())} неделя`);
});

// Memorize group
bot.onText(/^\/группа (.*)$/i, (msg, match) => {
  memorizeGroup(msg, match);
});

// Schedule url
bot.onText(/^\/ссылка$/i, (msg, match) => {
  link(msg, match);
});

// Schedule
bot.onText(/^\/расписание$/i, (msg, match) => {
  schedule(msg);
});

bot.on('callback_query', function (msg) {
  message = msg.message;
  const data = JSON.parse(msg.data);
  switch(data.t) {
    case 'n':
      m = {
        from: { id: message.chat.id },
        chat: { id: message.chat.id }
      };
      date = new Date();
      date.setTime(Date.parse(data.d));
      schedule(m, date, 1);
      break;
  }
});
