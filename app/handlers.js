const msgs = require('./messages');
const { buildKeyboard, standardKeyboard } = require('./keyboard')
const dateHelper = require('./helpers/date');

module.exports = function (ctx) {
    const { getRings, detectGroup, getSchedule } = require('./schedule')(ctx);
    const groupsChooser = require('./groupsChooser')(ctx)

    const module = {};

    const { bot, redis, logger } = ctx;

    module.rings = (msg, match) => {
        getRings().then(times => {
            bot.sendMessage(msg.chat.id, `Звонки:\n${times.join("\n")}`);
        }).catch(err => {
            logger.error(err);
            bot.sendMessage(msg.chat.id, msgs.error);
        });
    };

    module.chooseGroup = (msg, match) => {
        const buttons = groupsChooser.getFaculties().map(faculty => {
            return {
                text: faculty.name,
                callback_data: JSON.stringify({
                    t: 0, // choose group
                    a: 0, // select faculty
                    d: {
                        'f': faculty.index,
                    }
                })
            }
        })

        bot.sendMessage(msg.chat.id, 'Выберите факультет', {
            reply_markup: {
                inline_keyboard: buildKeyboard(buttons, 2)
            },
        })
    }

    module.memorizeGroup = (msg, match) => {
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
                    bot.sendMessage(msg.chat.id, `Я запомнил, что вы учитесь в группе *${groups[0].name}* ;)`, { parse_mode: 'Markdown' });
                }
            })
            .catch(err => {
                logger.error(err);
                bot.sendMessage(msg.chat.id, msgs.error);
            });
    };

    module.link = (msg, match) => {
        redis.getAsync(msg.from.id).then(groupId => {
            if (!groupId) {
                throw 'Group id not found';
            }
            bot.sendMessage(msg.chat.id, `https://vyatsuschedule.herokuapp.com/mobile/${groupId}/${process.env.SEASON}`);
        }).catch(err => {
            logger.error(err);
            bot.sendMessage(msg.chat.id, msgs.forgotStudent);
        });
    };

    module.schedule = (msg, date, nextDay) => {
        date = date || new Date();
        redis.getAsync(msg.from.id)
            .then(groupId => {
                if (!groupId) {
                    throw 'Group id not found';
                }

                return Promise.all([getRings(), getSchedule(groupId, date, nextDay)]);
            })
            .then(values => {
                const rings = values[0];
                const schedule = values[1];
                const answer = [];
                rings.forEach((v, i) => {
                    if (schedule.day[i]) {
                        answer.push(`*${v} >* ${schedule.day[i]}`);
                    }
                });

                bot.sendMessage(
                    msg.chat.id,
                    `Расписание (${schedule.date.getDate()}.${schedule.date.getMonth() + 1}, ${dateHelper.dayName(schedule.date)}):\n${answer.join("\n")}`,
                    {
                        parse_mode: 'Markdown'
                    }
                );
            })
            .catch(err => {
                logger.error(err);
                bot.sendMessage(msg.chat.id, msgs.forgotStudent);
            });
    };

    // t - type
    module.processCallback = (msg) => {
        const message = msg.message
        const userId = msg.from.id
        const chatId = message.chat.id

        const data = JSON.parse(msg.data)
        if (data.t == 0) { // choose group
            groupsChooser.processChoosing(data, userId, chatId)
        }
    }

    return module;
};
