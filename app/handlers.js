const msgs = require('./messages');
const { buildKeyboard} = require('./keyboard');
const dateHelper = require('./helpers/date');

module.exports = function (ctx) {
    const { getRings, getSchedule } = require('./schedule');
    const groupsChooser = require('./groupsChooser')(ctx);

    const module = {};

    const { bot, redis, logger } = ctx;

    module.rings = (msg) => {
        try {
            const rings = getRings();
            bot.sendMessage(msg.chat.id, `Звонки:\n${rings.join("\n")}`)
        } catch (err) {
            logger.error(err);
            bot.sendMessage(msg.chat.id, msgs.error)
        }
    };

    module.chooseGroup = (msg) => {
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
        });

        bot.sendMessage(msg.chat.id, 'Выберите факультет', {
            reply_markup: {
                inline_keyboard: buildKeyboard(buttons, 2)
            },
        })
    };

    module.link = async (msg) => {
        const groupId = await redis.getAsync(msg.from.id);

        if (!groupId) {
            bot.sendMessage(msg.chat.id, msgs.forgotStudent)
        } else {
            bot.sendMessage(msg.chat.id, `https://vyatsuschedule.herokuapp.com/mobile/${groupId}/${process.env.SEASON}`)
        }
    };

    module.schedule = async (msg) => {
        const groupId = await redis.getAsync(msg.from.id);

        if (!groupId) {
            bot.sendMessage(msg.chat.id, msgs.forgotStudent);
            return
        }
        try {
            const rings = getRings();
            const { day, date } = await getSchedule(groupId);
            
            const answer = [];
            rings.forEach((v, i) => {
                if (day[i]) {
                    answer.push(`*${v} >* ${day[i]}`)
                }
            });

            const monthDay = date.getDate();
            const month = date.getMonth() + 1;

            bot.sendMessage(
                msg.chat.id,
                `Расписание (${monthDay}.${month}, ${dateHelper.dayName(date)}):\n${answer.join("\n")}`,
                {
                    parse_mode: 'Markdown'
                }
            )
        } catch (err) {
            bot.sendMessage(msg.chat.id, msgs.error);
            logger.error(err)
        }
    };

    // t - type
    module.processCallback = (msg) => {
        const message = msg.message;
        const userId = msg.from.id;
        const chatId = message.chat.id;

        const data = JSON.parse(msg.data);
        if (data.t == 0) { // choose group
            groupsChooser.processChoosing(data, userId, chatId)
        }
    };

    return module
};
