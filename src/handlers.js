const messages = require('./static/messages');
const {buildKeyboard} = require('./utils/keyboard');
const dateHelper = require('./utils/date');
const userPreferences = require('./models/UserPreferences');
const groupsChooser = require('./groups-chooser');
const {getLogger} = require('./configs/logging');
const ringsData = require('./static/rings');
const buildingsData = require('./static/buildings');
const {callback_types, callback_actions} = require('./static/constants');
const beautify = require('./utils/beautify');
const api = require('./utils/api');
const Visit = require('./models/Visit');

const logger = getLogger('handlers');

const WEBAPP_URL = process.env.WEBAPP_URL;

let season = '';

const rings = async (message, bot) => {
    const data = beautify.rings(ringsData);
    await bot.sendMessage(message['chat']['id'], `Звонки:\n${data.join('\n')}`);
};

const group = async (message, bot) => {
    try {
        const buttons = groupsChooser.getFaculties()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(faculty => {
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
    const preferences = await userPreferences.findOne({
        telegram_id: message.from.id
    });

    if (!preferences) {
        await bot.sendMessage(message['chat']['id'], messages.forgotStudent);
    } else {
        const groupId = preferences.group_id;
        await bot.sendMessage(message['chat']['id'], `${WEBAPP_URL}/#/schedule/${groupId}/${season}`);
    }
};

const schedule = async (message, bot, offset = 0) => {
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
        const {week, dayOfWeek, date} = dateHelper.advance(today, offset);

        const dayName = dateHelper.dayName(dayOfWeek);
        const dayOfMonth = date.slice(0, 2);
        const month = date.slice(2, 4);

        const empty = weeks[week][dayOfWeek].every(lesson => lesson == '');
        const text = `Расписание (${dayOfMonth}.${month}, ${dayName}):\n` + (
            empty ?
                'Занятий нет' :
                beautify
                    .schedule(ringsData, beautify.lessons(weeks[week][dayOfWeek]))
                    .join('\n')
        );

        await bot.sendMessage(message['chat']['id'], text, {
            parse_mode: 'markdown',
            reply_markup: {
                inline_keyboard: buildKeyboard([{
                    text: 'На завтра',
                    callback_data: JSON.stringify([callback_types.NEXT_DAY_SCHEDULE])
                }], 1)
            }
        });
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

const nextDayScheduleCallback = async (callbackData, userId, chatId, bot) => {
    const message = {
        chat: {
            id: chatId
        },
        from: {
            id: userId
        }
    };

    await schedule(message, bot, 1);
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
    case callback_types.NEXT_DAY_SCHEDULE:
        await nextDayScheduleCallback(data, userId, chatId, bot);
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
        botInstance.on('message', async (message) => {
            const userId = message['from']['id'];
            const userName = message['from']['username'];

            logger.info(`USER: ${userId}:${userName}; MESSAGE: ${message['text']}`);

            const visit = new Visit({
                telegram_id: userId,
                data: message['text'],
                type: 'MESSAGE'
            });
            await visit.save();
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

            const visit = new Visit({
                telegram_id: userId,
                data: message['data'],
                type: 'CALLBACK_QUERY'
            });
            await visit.save();

            await callback(message, botInstance);
        });
    }
};
