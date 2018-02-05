const ENV = process.env.NODE_ENV || 'development';
if (ENV == 'development') require('dotenv').config();

const TOKEN = process.env.TG_BOT_TOKEN;
const URL = process.env.URL;

const sch = require('./schedule');
const dateHelper = require('./helpers/date');

// Logger
const logger = require('log4js').getLogger();
logger.level = 'debug';

// Mongoose
require('mongoose').connect(process.env.MONGO_URL);
const Visit = require('./models/Visit');

// Redis
const redis = require('redis').createClient(process.env.REDIS_URL);
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

const HELP =
`Чат бот ВятГУ для просмотра расписания студентов. Альфа-бета-гамма версия. Могут быть баги.
Команды (палка "|" означает ИЛИ):
1. з|звонки|r|rings - расписание звонков
2. н|неделя|w|week - номер текущей недели
3. г|группа|g|group имя_группы - бот запомнит, в какой вы группе (можно вводить не полностью, предложит варианты)
4. р|расписание|s|schedule - расписание на текущий день (работает, если бот знает группу)
5. u|url|с|ссылка - ссылка на полное расписание группы
* Я пока молодой бот, меня батька создал лежа на диване сегодня с утра (4 февраля 2018), поэтому пишите ему https://vk.com/volodyaglyxix`;

bot.on('message', (msg) => {
  const visit = new Visit({ telegram_id: msg.from.id, message: msg.text });
  visit.save();
  logger.info(`From: ${msg.from.id}:${msg.from.username}; Message: ${msg.text}`);
});

// Start bot
bot.onText(/\/start/, (msg, match) => {
  bot.sendMessage(msg.chat.id, 'Чат бот ВятГУ для просмотра расписания студентов. Для справки введите help или помощь.');
});

// Help
bot.onText(/^\/?(help|помощь)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, HELP);
});

// Rings
bot.onText(/^\/?(r|rings|з|звонки)$/i, (msg, match) => {
  sch.rings()
    .then(rings => {
      bot.sendMessage(msg.chat.id, `Звонки:\n${rings.join("\n")}`);
    })
    .catch(err => {
      logger.error(err);
      bot.sendMessage(msg.chat.id, 'Ууупс... Какая-то ошибка :(');
    });
});

// Week
bot.onText(/^\/?(w|week|н|неделя)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, `${sch.currentWeek()} неделя`);
});

// Memorize group
bot.onText(/^\/?(g|group|г|группа)(.+)?$/i, (msg, match) => {
  if (match[2]) {
    sch.detectGroup(match[2])
      .then(res => {
        if (res.length == 0) {
          bot.sendMessage(msg.chat.id, 'Подходящих групп не найдено. Возможно Вы вводите группу с ошибкой, пример: ИВТб-3302-02-00 (без учета регистра)');
        } else if (res.length > 1) {
          bot.sendMessage(msg.chat.id, `Список похожих групп:\n${res.map(g => g.name).join("\n")}`);
        } else {
          redis.set(msg.from.id, res[0].id);
          bot.sendMessage(msg.chat.id, `Я запомнил, что вы учитесь в группе ${res[0].name} ;)`);
        }
      })
      .catch(err => {
        logger.error(err);
        bot.sendMessage(msg.chat.id, 'Ууупс... Какая-то ошибка :(');
      });
  } else {
    bot.sendMessage(msg.chat.id, 'Повторите сообщение, не забыв указать имя группы :)');
  }
});

// Schedule url
bot.onText(/^(url|u|ссылка|с)$/i, (msg, match) => {
  redis.get(msg.from.id, (err, groupId) => {
    if (err) {
      logger.error(`Error: ${err}`);
      return;
    }

    if (groupId) {
      bot.sendMessage(msg.chat.id, `https://vyatsuschedule.herokuapp.com/mobile/${groupId}/${process.env.SEASON}`);
    } else {
      bot.sendMessage(msg.chat.id, "К сожалению, я очень забывчивый бот. Либо Вы впервые здесь, либо я Вас забыл. Укажите группу, например:\n группа ивтб-3302");
    }
  });
});

// Schedule
bot.onText(/^\/?(s|schedule|р|расписание)$/i, (msg, match) => {
  redis.get(msg.from.id, (err, groupId) => {
    if (err) {
      logger.error(`Error: ${err}`);
      return;
    }

    if (groupId) {
      sch.schedule(groupId)
        .then(schedule => {
          sch.rings(true).then(rings => {
            answer = [];
            rings.forEach((v, i) => {
              if (schedule.day[i]) {
                answer.push(`${v} > ${schedule.day[i]}`);
              }
            });
            const keyboard = {
              inline_keyboard: [
                [{ text: 'Next', callback_data: groupId }]
              ]
            };
            bot.sendMessage(
              msg.chat.id,
              `Расписание (${schedule.date.toLocaleDateString()}, ${dateHelper.dayName(schedule.date)}):\n${answer.join("\n")}`,
              { reply_markup: keyboard }
            );
          });
        })
        .catch(err => {
          logger.error(err);
          bot.sendMessage(msg.chat.id, 'Ууупс... Какая-то ошибка :(');
        });
    } else {
      bot.sendMessage(msg.chat.id, "К сожалению, я очень забывчивый бот. Либо Вы впервые здесь, либо я Вас забыл. Укажите группу, например:\n группа ивтб-3302");
    }
  });
});

bot.onText(/test/i, (msg, match) => {
  const keyboard = {
    inline_keyboard: [
      [{ text: 'Next', callback_data: 'next' }]
    ]
  };
  bot.sendMessage(msg.chat.id, 'text', { reply_markup: keyboard });
});

bot.on('callback_query', function (msg) {
  message = msg.message;
  sch.schedule(msg.data, 1)
    .then(schedule => {
      sch.rings(true).then(rings => {
        answer = [];
        rings.forEach((v, i) => {
          if (schedule.day[i]) {
            answer.push(`${v} > ${schedule.day[i]}`);
          }
        });
        bot.sendMessage(message.chat.id, `Расписание (${schedule.date.toLocaleDateString()}, ${dateHelper.dayName(schedule.date)}):\n${answer.join("\n")}`);
      });
    })
    .catch(err => {
      logger.error(err);
      bot.sendMessage(message.chat.id, 'Ууупс... Какая-то ошибка :(');
    });
});
