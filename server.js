const ENV = process.env.NODE_ENV || 'development';

if (ENV == 'development') {
  require('dotenv').config();
}

const BASE_API = process.env.BASE_API;

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const redis = require("redis").createClient(process.env.REDIS_URL);
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL);

const Visit = mongoose.model('Visit', {
  telegram_id: String,
  date: { type: Date, default: Date.now }
});

const bot = new TelegramBot(process.env.TG_BOT_TOKEN, { polling: true });

const HELP = 
`Чат бот ВятГУ для просмотра расписания студентов. Альфа-бета-гамма версия. Могут быть баги.
Команды (палка | означает ИЛИ):
* з|звонки|r|rings - расписание звонков
* н|неделя|w|week - номер текущей недели
* г|группа|g|group <имя_группы> - бот запомнит в какой вы группе (можно вводить не полностью, предложит варианты)
* р|расписание|s|schedule - расписание на текущий день (работает если бот знает группу)
`;

redis.on("error", function (err) {
  console.error("Error " + err);
});

bot.onText(/\/start/, (msg, match) => {
  bot.sendMessage(msg.chat.id, 'Чат бот ВятГУ для просмотра расписания студентов. Для справки введите help или помощь.');
});

bot.onText(/^(help|помощь)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, HELP);
});

bot.onText(/^(r|rings|з|звонки)$/i, (msg, match) => {
  rings()
    .then(rings => {
      bot.sendMessage(msg.chat.id, `Звонки:\n${rings.join("\n")}`);
    })
    .catch(err => {
      console.error(err);
      bot.sendMessage(msg.chat.id, 'Ууупс... Какая-то ошибка :(');
    });
});

bot.onText(/^(w|week|н|неделя)$/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, `${currentWeek()} неделя`);
});

bot.onText(/^(g|group|г|группа) (.+)$/i, (msg, match) => {
  detectGroup(match[2])
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

bot.onText(/^(s|schedule|р|расписание)$/i, (msg, match) => {
  redis.get(msg.from.id, (err, groupId) => {
    if (err) {
      console.error(`Error: ${err}`);
      return;
    }

    if (groupId) {
      schedule(groupId)
        .then(schedule => {
          rings().then(rings => {
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

bot.on('message', (msg) => {
  const visit = new Visit({ telegram_id: msg.from.id });
  visit.save();
  console.log(`From: ${msg.from.username}; Message: ${msg.text}`);
});

function rings() {
  return new Promise((resolve, reject) => {
    axios.get(`${BASE_API}/v2/calls`).then(res => {
      const rings = [];
      res.data.forEach((v, i) => {
        rings.push(`${i + 1}) ${v.start}-${v.end}`);
      });
      resolve(rings);
    }).catch(err => { reject(err); });
  });
}

function currentWeek() {
  const termStartDate = new Date(process.env.FIRST_WEEK_START);
  const currentDate = new Date();
  const timeDiff = Math.abs(currentDate.getTime() - termStartDate.getTime());
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return Math.floor(diffDays / 7) % 2 + 1;
}

function detectGroup(groupName) {
  return new Promise((resolve, reject) => {
    axios.get(`${BASE_API}/v2/groups.json`).then(res => {
      const similarGroups = res.data.filter(g => {
        const regExp = new RegExp(groupName, "i");
        return g.name.search(regExp) >= 0;
      });
      resolve(similarGroups);
    }).catch(err => { reject(err); });
  });
}

function schedule(groupId) {
  return new Promise((resolve, reject) => {
    axios.get(`${BASE_API}/schedule/${groupId}/${process.env.SEASON}`).then(res => {
      let curWeekNumber = currentWeek();
      let date = new Date();
      let curDayNumber = (date.getDay() + 6) % 7;
      // If sunday then go to mon of next week
      if (curDayNumber == 6) {
        date.setDate(date.getDate() + 1);
        curDayNumber = 0;
        curWeekNumber = (curWeekNumber + 1) % 2;
      }
      const curWeek = res.data.weeks[curWeekNumber]
      resolve({ day: curWeek[curDayNumber], date: date });
    }).catch(err => { reject(err); })
  });
}