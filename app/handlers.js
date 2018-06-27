const msgs = require('./messages');
const bot = require('./configs/bot');
const {buildKeyboard} = require('./keyboard');
const dateHelper = require('./helpers/date');
const userPreferences = require('./models/UserPreferences');
const {getRings, getSchedule} = require('./schedule');
const groupsChooser = require('./groupsChooser')();
const {getLogger} = require('./configs/logging');

const logger = getLogger('handler');

module.exports = {
    rings: async (msg) => {
        try {
            const rings = getRings();
            await bot.sendMessage(msg.chat.id, `Звонки:\n${rings.join("\n")}`)
        } catch (err) {
            logger.error(err);
            await bot.sendMessage(msg.chat.id, msgs.error)
        }
    },

    chooseGroup: async (msg) => {
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

        await bot.sendMessage(msg.chat.id, 'Выберите факультет', {
            reply_markup: {
                inline_keyboard: buildKeyboard(buttons, 2)
            },
        })
    },

    link: async (msg) => {
        const preferences = await await userPreferences.findOne({
            telegram_id: msg.from.id
        });

        if (!preferences) {
            await bot.sendMessage(msg.chat.id, msgs.forgotStudent)
        } else {
            const groupId = preferences.group_id;
            await bot.sendMessage(msg.chat.id, `https://vyatsuschedule.ru/#/schedule/${groupId}/${process.env.SEASON}`)
        }
    },

    schedule: async (msg) => {
        const doc = await userPreferences.findOne({
            telegram_id: msg.from.id
        });

        if (!doc) {
            await bot.sendMessage(msg.chat.id, msgs.forgotStudent);
            return
        }
        try {
            const groupId = doc.group_id;
            const rings = getRings();
            const {day, date} = await getSchedule(groupId);

            const answer = [];
            rings.forEach((v, i) => {
                if (day[i]) {
                    answer.push(`*${v} >* ${day[i]}`)
                }
            });

            const monthDay = date.getDate();
            const month = date.getMonth() + 1;

            await bot.sendMessage(
                msg.chat.id,
                `Расписание (${monthDay}.${month}, ${dateHelper.dayName(date)}):\n${answer.join("\n")}`,
                {
                    parse_mode: 'Markdown'
                }
            )
        } catch (err) {
            await bot.sendMessage(msg.chat.id, msgs.error);
            logger.error(err)
        }
    },

    // t - type
    processCallback: async (msg) => {
        const message = msg.message;
        const userId = msg.from.id;
        const chatId = message.chat.id;

        const data = JSON.parse(msg.data);
        if (data.t == 0) { // choose group
            await groupsChooser.processChoosing(data, userId, chatId)
        }
    }
};
