const ENV = process.env.NODE_ENV || 'development';
if (ENV == 'development') require('dotenv').config();

const sch = require('./schedule');

// Mongoose
require('mongoose').connect(process.env.MONGO_URL);
const Visit = require('./models/Visit');

// Redis
const redis = require('redis').createClient(process.env.REDIS_URL);
redis.on("error", function (err) {
  console.error("Error " + err);
});

// Telegram bot
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TG_BOT_TOKEN, { polling: true });

const HELP =
`Чат бот ВятГУ для просмотра расписания студентов. Альфа-бета-гамма версия. Могут быть баги.
Команды (палка "|" означает ИЛИ):
* з|звонки|r|rings - расписание звонков
* н|неделя|w|week - номер текущей недели
* г|группа|g|group имя_группы - бот запомнит, в какой вы группе (можно вводить не полностью, предложит варианты)
* р|расписание|s|schedule - расписание на текущий день (работает, если бот знает группу)
Я пока молодой бот, меня батька создал лежа на диване сегодня с утра (4 февраля 2018), поэтому пишите ему https://vk.com/volodyaglyxix`;

bot.on('message', (msg) => {
  const visit = new Visit({ telegram_id: msg.from.id });
  visit.save();
  console.log(`From: ${msg.from.id}:${msg.from.username}; Message: ${msg.text}`);
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
      console.error(err);
      bot.sendMessage(msg.chat.id, 'Ууупс... Какая-то ошибка :(');
    });
});

// Week
bot.onText(/^\/?(w|week|н|неделя)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, `${sch.currentWeek()} неделя`);
});

// Memorize group
bot.onText(/^\/?(g|group|г|группа) (.+)$/i, (msg, match) => {
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
      console.error(err);
    });
});

// Schedule
bot.onText(/^\/?(s|schedule|р|расписание)$/i, (msg, match) => {
  redis.get(msg.from.id, (err, groupId) => {
    if (err) {
      console.error(`Error: ${err}`);
      return;
    }

    if (groupId) {
      sch.schedule(groupId)
        .then(schedule => {
          sch.rings().then(rings => {
            answer = [];
            rings.forEach((v, i) => {
              answer.push(`${v} => ${schedule.day[i]}`);
            });
            bot.sendMessage(msg.chat.id, `Расписание (${schedule.date.toLocaleDateString()}):\n${answer.join("\n")}`);
          });
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      bot.sendMessage(msg.chat.id, "К сожалению, я очень забывчивый бот. Либо Вы впервые здесь, либо я Вас забыл. Укажите группу, например:\n группа ивтб-3302");
    }
  });
});
