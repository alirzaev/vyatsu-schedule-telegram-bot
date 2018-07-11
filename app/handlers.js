const messages = require('./static/messages');
const {buildKeyboard} = require('./keyboard');
const dateHelper = require('./utils/date');
const userPreferences = require('./models/UserPreferences');
const {getSchedule} = require('./utils/schedule');
const groupsChooser = require('./groups-chooser');
const {getLogger} = require('./configs/logging');
const ringsData = require('./static/rings');
const { callback_types, callback_actions } = require('./static/constants');

const logger = getLogger('handlers');

const rings = async (message, bot) => {
    try {
        const data = ringsData.map((v, i) => `${i + 1}) ${v.start}-${v.end}`);
        await bot.sendMessage(message['chat']['id'], `Звонки:\n${data.join('\n')}`);
    } catch (err) {
        logger.error(err);
        await bot.sendMessage(message['chat']['id'], messages.error);
    }
};

const group = async (message, bot) => {
    const buttons = groupsChooser.getFaculties().map(faculty => {
        return {
            text: faculty.name,
            callback_data: JSON.stringify([
                callback_types.CHOOSE_GROUP,
                callback_actions.ON_FACULTY_SELECT,
                faculty.index
            ])
        };
    });

    await bot.sendMessage(message['chat']['id'], 'Выберите факультет', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 2)
        },
    });
};

const link = async (message, bot) => {
    const preferences = await await userPreferences.findOne({
        telegram_id: message.from.id
    });

    if (!preferences) {
        await bot.sendMessage(message['chat']['id'], messages.forgotStudent);
    } else {
        const groupId = preferences.group_id;
        await bot.sendMessage(message['chat']['id'], `https://vyatsuschedule.ru/#/schedule/${groupId}/${process.env.SEASON}`);
    }
};

const schedule = async (message, bot) => {
    const doc = await userPreferences.findOne({
        telegram_id: message.from.id
    });

    if (!doc) {
        await bot.sendMessage(message['chat']['id'], messages.forgotStudent);
        return;
    }
    try {
        const groupId = doc.group_id;
        const {day, date} = await getSchedule(groupId);

        const answer = [];
        ringsData.forEach((v, i) => {
            if (day[i]) {
                answer.push(`*${v.start} >* ${day[i]}`);
            }
        });

        const monthDay = date.getDate();
        const month = date.getMonth() + 1;

        await bot.sendMessage(
            message['chat']['id'],
            `Расписание (${monthDay}.${month}, ${dateHelper.dayName(date)}):\n${answer.join('\n')}`,
            {
                parse_mode: 'Markdown'
            }
        );
    } catch (err) {
        await bot.sendMessage(message['chat']['id'], messages.error);
        logger.error(err);
    }
};

// message data format: [type, ...data]
const callback = async (message, bot) => {
    const userId = message['from']['id'];
    const chatId = message['message']['chat']['id'];

    const [type, ...data] = JSON.parse(message.data);
    if (type === callback_types.CHOOSE_GROUP) {
        await groupsChooser.processChoosing(data, userId, chatId, bot);
    }
};

module.exports = {
    initialize: async () => {
        await groupsChooser.initialize();
    },

    setMessageHandlers: (botInstance) => {
        // Logging
        botInstance.on('message', (message) => {
            logger.info(`From: ${message['from']['id']}:${message['from']['username']}`);
            logger.info(`Message: ${message['text']}`);
        });

        // Command /start
        botInstance.onText(/^\/start$/i, async (message) => {
            await botInstance.sendMessage(message['chat']['id'], messages.help, {
                parse_mode: 'html'
            });
        });

        // Command /help
        botInstance.onText(/^\/help$/i, async (message) => {
            await botInstance.sendMessage(message['chat']['id'], messages.help, {
                parse_mode: 'html'
            });
        });

        // Command /rings
        botInstance.onText(/^\/rings$/i, async (message) => {
            await rings(message, botInstance);
        });

        // Command /group
        botInstance.onText(/^\/group$/i, async (message) => {
            await group(message, botInstance);
        });

        // Command /link
        botInstance.onText(/^\/link$/i, async (message) => {
            await link(message, botInstance);
        });

        // Command /schedule
        botInstance.onText(/^\/schedule$/i, async (message) => {
            await schedule(message, botInstance);
        });
    },

    setCallbackHandlers: (botInstance) => {
        botInstance.on('callback_query', async (message) => {
            logger.info(`From: ${message['from']['id']}:${message['from']['username']}`);
            logger.info(`Callback query: ${message['data']}`);

            await callback(message, botInstance);
        });
    }
};
