const ENV = process.env.NODE_ENV || 'development';
if (ENV == 'development') require('dotenv').config();

const TOKEN = process.env.TG_BOT_TOKEN;
const URL = process.env.URL;

const sch = require('./schedule');
const dateHelper = require('./helpers/date');
const msgs = require('./messages');

const Promise = require("bluebird");

// Logger
const logger = require('log4js').getLogger();
logger.level = 'debug';

// Mongoose
require('mongoose').connect(process.env.MONGO_URL);
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
    port: process.env.PORT || 5000
  }
});
bot.setWebHook(`${URL}${TOKEN}`);

// Save all needed dependencies to ctx
const ctx = { logger, redis, bot }

const { rings, memorizeGroup, link, schedule, scheduleWithGroupID } = require('./handlers')(ctx);

// Save request
bot.on('message', (msg) => {
  const visit = new Visit({ telegram_id: msg.from.id, message: msg.text });
  visit.save();
  logger.info(`From: ${msg.from.id}:${msg.from.username}; Message: ${msg.text}`);
});

// Start bot
bot.onText(/\/start/, (msg, match) => {
  bot.sendMessage(msg.chat.id, msgs.desc);
});

// Help
bot.onText(/^\/?(help|помощь)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, msgs.help);
});

// Rings
bot.onText(/^\/?(r|rings|з|звонки)$/i, (msg, match) => {
  rings(msg, match);
});

// Week
bot.onText(/^\/?(w|week|н|неделя)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, `${sch.currentWeek()} неделя`);
});

// Memorize group
bot.onText(/^\/?(g|group|г|группа) (.+)$/i, (msg, match) => {
  logger.info(match);
  memorizeGroup(msg, match);
});

// Schedule url
bot.onText(/^(url|u|ссылка|с)$/i, (msg, match) => {
  link(msg, match);
});

// Schedule
bot.onText(/^\/?(s|schedule|р|расписание)$/i, (msg, match) => {
  schedule(msg, match);
});

bot.on('callback_query', function (msg) {
  message = msg.message;
  logger.info(message);
  const data = JSON.parse(msg.data);
  switch(data.type) {
    case 'next':
      scheduleWithGroupID(data.groupId, true);
      break;
  }
});
