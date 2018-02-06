const msgs = require('./messages');
const dateHelper = require('./helpers/date');

module.exports = function(ctx) {
  const { rings, detectGroup, schedule } = require('./schedule')(ctx);

  const module = {};

  const { bot, redis, logger } = ctx;

  module.rings = function(msg, match) {
    rings().then(times => {
      bot.sendMessage(msg.chat.id, `Звонки:\n${times.join("\n")}`);
    }).catch(err => {
      logger.error(err);
      bot.sendMessage(msg.chat.id, msgs.error);
    });
  };

  module.memorizeGroup = function(msg, match) {
    const groupName = match[2];

    if (!groupName) {
      bot.sendMessage(msg.chat.id, msgs.group.forgotName);
      return;
    }

    detectGroup(groupName)
      .then(groups => {
        if (groups.length == 0) {
          bot.sendMessage(msg.chat.id, msgs.group.notFound);
        } else if (groups.length > 1) {
          bot.sendMessage(msg.chat.id, `Список похожих групп:\n${groups.map(g => g.name).join("\n")}`);
        } else {
          redis.set(msg.from.id, groups[0].id);
          bot.sendMessage(msg.chat.id, `Я запомнил, что вы учитесь в группе ${groups[0].name} ;)`);
        }
      })
      .catch(err => {
        logger.error(err);
        bot.sendMessage(msg.chat.id, msgs.error);
      });
  };

  module.link = function(msg, match) {
    redis.getAsync(msg.from.id).then(groupId => {
      if (!groupId) throw 'Group id not found';
      bot.sendMessage(msg.chat.id, `https://vyatsuschedule.herokuapp.com/mobile/${groupId}/${process.env.SEASON}`);
    }).catch(err => {
      logger.error(err);
      bot.sendMessage(msg.chat.id, msgs.forgotStudent);
    });
  };

  module.schedule = function(msg, date, nextDay) {
    date = date || new Date();
    redis.getAsync(msg.from.id)
      .then(groupId => {
        if (!groupId) throw 'Group id not found';
        return Promise.all([rings(true), schedule(groupId, date, nextDay)]);
      })
      .then(values => {
        const rings = values[0];
        const schedule = values[1];
        const answer = [];
        rings.forEach((v, i) => {
          if (schedule.day[i]) {
            answer.push(`${v} > ${schedule.day[i]}`);
          }
        });
        const keyboard = { 
          inline_keyboard: [
            [
              { 
                text: 'Next',
                callback_data: JSON.stringify({ t: 'n', d: schedule.date.toDateString(), gid: schedule.groupId }) }
            ]
          ]
        };
        bot.sendMessage(
          msg.chat.id,
          `Расписание (${schedule.date.toLocaleDateString()}, ${dateHelper.dayName(schedule.date)}):\n${answer.join("\n")}`,
          { reply_markup: keyboard }
        );
      })
      .catch(err => {
        logger.error(err);
        bot.sendMessage(msg.chat.id, msgs.forgotStudent);
      });
  };

  module.scheduleWithGroupID = function(msg, groupId, nextDay) {
    Promise.all([rings(true), schedule(groupId, new Date(), nextDay)])
      .then(values => {
        const rings = values[0];
        const schedule = values[1];
        let answer = [];
        rings.forEach((v, i) => {
          if (schedule.day[i]) {
            answer.push(`${v} > ${schedule.day[i]}`);
          }
        });
        if (!nextDay) {
          const keyboard = { 
            inline_keyboard: [
              [
                { text: 'Next', callback_data: JSON.stringify({ type: 'next', groupId: schedule.groupId }) }
              ]
            ]
          };
          bot.sendMessage(
            msg.chat.id,
            `Расписание (${schedule.date.toLocaleDateString()}, ${dateHelper.dayName(schedule.date)}):\n${answer.join("\n")}`,
            { reply_markup: keyboard }
          );
        } else {
          bot.sendMessage(
            msg.chat.id,
            `Расписание (${schedule.date.toLocaleDateString()}, ${dateHelper.dayName(schedule.date)}):\n${answer.join("\n")}`
          );
        }
      })
      .catch(err => {
        logger.error(err);
        bot.sendMessage(msg.chat.id, msgs.error);
      });
  };

  return module;
};
