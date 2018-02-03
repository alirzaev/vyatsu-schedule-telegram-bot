require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const BASE_API = process.env.BASE_API;
const TOKEN = process.env.TG_BOT_TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/(r|rings|з|звонки)/i, (msg, match) => {
  rings()
    .then(res => {
      bot.sendMessage(msg.chat.id, res);
    })
    .catch(err => {
      console.error(err);
      bot.sendMessage(msg.chat.id, 'Ууупс... Какая-то ошибка :(')
    });
});

bot.onText(/(w|week|н|неделя)/i, (msg, match) => {
  bot.sendMessage(msg.chat.id, `${currentWeek()} неделя`);
});

bot.on('message', (msg) => {
  console.log(`From: ${msg.from.username}; Message: ${msg.text}`);
});

function rings() {
  return new Promise((resolve, reject) => {
    axios.get(`${BASE_API}/v2/calls`)
      .then(res => {
        const answer = [];
        res.data.forEach((v, i) => {
          answer.push(`${i + 1}) ${v.start}-${v.end}`);
        });
        resolve(`Звонки:\n${answer.join("\n")}`);
      })
      .catch(err => {
        reject(err);
      });
  });
}

function currentWeek() {
  const termStartDate = new Date(process.env.FIRST_WEEK_START);
  const currentDate = new Date();
  const timeDiff = Math.abs(currentDate.getTime() - termStartDate.getTime());
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return Math.floor(diffDays / 7) % 2 + 1;
}