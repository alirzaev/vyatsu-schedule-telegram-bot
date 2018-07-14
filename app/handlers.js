const messages = require('./static/messages');
const {buildKeyboard} = require('./utils/keyboard');
const dateHelper = require('./utils/date');
const userPreferences = require('./models/UserPreferences');
const groupsChooser = require('./groups-chooser');
const {getLogger} = require('./configs/logging');
const ringsData = require('./static/rings');
const buildingsData = require('./static/buildings');
const { callback_types, callback_actions } = require('./static/constants');
const beautify = require('./utils/beautify');
const api = require('./utils/api');

const logger = getLogger('handlers');

let season = '';

const rings = async (message, bot) => {
    const data = beautify.rings(ringsData);
    await bot.sendMessage(message['chat']['id'], `Звонки:\n${data.join('\n')}`);
};

const group = async (message, bot) => {
    try {
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
    } catch (err) {
        logger.error(err);
        await bot.sendMessage(message['chat']['id'], messages.error);
    }
};

const link = async (message, bot) => {
    const preferences = await await userPreferences.findOne({
        telegram_id: message.from.id
    });

    if (!preferences) {
        await bot.sendMessage(message['chat']['id'], messages.forgotStudent);
    } else {
        const groupId = preferences.group_id;
        await bot.sendMessage(message['chat']['id'], `https://vyatsuschedule.ru/#/schedule/${groupId}/${season}`);
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

        const data = await api.schedule(groupId, season);
        const {weeks, today} = data;
        const {week, dayOfWeek, date} = today;

        const dayName = dateHelper.dayName(dayOfWeek);
        const dayOfMonth = date.slice(0, 2);
        const month = date.slice(2, 4);

        const empty = weeks[week][dayOfWeek].every(lesson => lesson == '');
        if (empty) {
            await bot.sendMessage(
                message['chat']['id'],
                `Расписание (${dayOfMonth}.${month}, ${dayName}):\nЗанятий нет`
            );
        } else {
            const schedule = beautify.schedule(
                ringsData,
                beautify.lessons(weeks[week][dayOfWeek])
            );

            await bot.sendMessage(
                message['chat']['id'],
                `Расписание (${dayOfMonth}.${month}, ${dayName}):\n${schedule.join('\n')}`,
                {
                    parse_mode: 'markdown'
                }
            );
        }
    } catch (err) {
        await bot.sendMessage(message['chat']['id'], messages.error);
        logger.error(err);
    }
};

const where = async (message, bot) => {
    const buttons = buildingsData.map((building, index) => {
        return {
            text: building.number,
            callback_data: JSON.stringify([
                callback_types.BUILDING_ADDRESS,
                index
            ])
        };
    });

    await bot.sendMessage(message['chat']['id'], 'Выберите номер корпуса', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 4)
        },
    });
};

const whereCallback = async (callbackData, userId, chatId, bot) => {
    const [number] = callbackData;

    const {address, latitude, longitude} = buildingsData[number];

    await bot.sendMessage(chatId, address);
    await bot.sendLocation(chatId, latitude, longitude);
};

// message data format: [type, ...data]
const callback = async (message, bot) => {
    const userId = message['from']['id'];
    const chatId = message['message']['chat']['id'];

    const [type, ...data] = JSON.parse(message.data);
    switch (type) {
    case callback_types.CHOOSE_GROUP:
        await groupsChooser.process(data, userId, chatId, bot);
        break;
    case callback_types.BUILDING_ADDRESS:
        await whereCallback(data, userId, chatId, bot);
        break;
    }
};

module.exports = {
    initialize: async () => {
        await groupsChooser.initialize();
        season = await api.season();
    },

    setMessageHandlers: (botInstance) => {
        // Logging
        botInstance.on('message', (message) => {
            const userId = message['from']['id'];
            const userName = message['from']['username'];

            logger.info(`USER: ${userId}:${userName}; MESSAGE: ${message['text']}`);
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

        // Command /where
        botInstance.onText(/^\/where$/i, async (message) => {
            await where(message, botInstance);
        });
    },

    setCallbackHandlers: (botInstance) => {
        botInstance.on('callback_query', async (message) => {
            const userId = message['from']['id'];
            const userName = message['from']['username'];

            logger.info(`USER: ${userId}:${userName}; CALLBACK_DATA: ${message['data']}`);

            await callback(message, botInstance);
        });
    }
};
