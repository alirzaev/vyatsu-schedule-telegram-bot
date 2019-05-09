const {Map, fromJS} = require('immutable');
const {buildKeyboard} = require('./utils/keyboard');
const userPreferences = require('./models/UserPreferences');
const {callback_actions, callback_types} = require('./static/constants');
const api = require('./utils/api');

let groupsInfo = new Map();

function getFacultyShorthand(facultyName) {
    const i = facultyName.indexOf('(');
    if (i !== -1) {
        return facultyName.slice(0, i).trim();
    } else {
        return facultyName;
    }
}

function getGroupInfo(groupItem) {
    const id = groupItem['id'];
    const name = groupItem['name'];

    const match = name.match(/([А-Яа-я]+)-(\d+)-\d+-\d+/);
    const speciality = match[1].slice(0, -1);
    const course = Number.parseInt(match[2].slice(0, 1));

    return {
        id,
        name,
        speciality,
        course
    };
}

function getFacultyInfo(facultyItem) {
    const fullFacultyName = facultyItem['faculty'];
    const name = getFacultyShorthand(fullFacultyName);
    const groups = facultyItem['groups'];

    const specialities = (new Map()).withMutations(mutable => {
        for (const group of groups) {
            const {id, name, speciality, course} = getGroupInfo(group);

            mutable.setIn([speciality, course, id], name);
        }
    });

    return fromJS({
        name,
        specialities
    });
}

// action data format: [facultyIndex, ...data]
async function commandOnSelectFaculty(actionData, userId, chatId, bot) {
    const [facultyIndex] = actionData;

    const specialities = groupsInfo.getIn([facultyIndex, 'specialities']);

    const buttons = Array
        .from(specialities.keys())
        .sort()
        .map(speciality => (
            {
                text: speciality,
                callback_data: JSON.stringify([
                    callback_types.CHOOSE_GROUP,
                    callback_actions.ON_SPECIALITY_SELECT,
                    facultyIndex,
                    speciality
                ])
            }
        ));

    await bot.sendMessage(chatId, 'Выберите специальность', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 3),
            resize_keyboard: true
        },
    });
}

// action data format: [facultyIndex, speciality, ...data]
async function commandOnSelectSpec(actionData, userId, chatId, bot) {
    const [facultyIndex, speciality] = actionData;

    const courses = groupsInfo.getIn([
        facultyIndex, 'specialities', speciality
    ]);

    const buttons = Array
        .from(courses.keys())
        .sort()
        .map(course => ({
            text: course,
            callback_data: JSON.stringify([
                callback_types.CHOOSE_GROUP,
                callback_actions.ON_COURSE_SELECT,
                facultyIndex,
                speciality,
                course
            ])
        }));

    await bot.sendMessage(chatId, 'Выберите курс', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 2),
            resize_keyboard: true
        },
    });
}

// action data format: [facultyIndex, speciality, course, ...data]
async function commandOnSelectCourse(actionData, userId, chatId, bot) {
    const [facultyIndex, speciality, course] = actionData;

    const groups = groupsInfo.getIn([
        facultyIndex, 'specialities', speciality, course
    ]);

    const buttons = Array
        .from(groups.entries())
        .sort((first, second) => {
            return first[1].localeCompare(second[1]);
        })
        .map(([groupId, groupName]) => ({
            text: groupName,
            callback_data: JSON.stringify([
                callback_types.CHOOSE_GROUP,
                callback_actions.ON_GROUP_SELECT,
                facultyIndex,
                speciality,
                course,
                groupId
            ])
        }));

    await bot.sendMessage(chatId, 'Выберите группу', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 2),
            resize_keyboard: true
        },
    });
}

// action data format: [facultyIndex, speciality, course, groupId, ...data]
async function commandOnSelectGroup(actionData, userId, chatId, bot) {
    const [facultyIndex, speciality, course, groupId] = actionData;

    const groupName = groupsInfo.getIn([
        facultyIndex, 'specialities', speciality, course, groupId
    ]);

    await userPreferences.replaceOne({
        telegram_id: userId
    }, {
        telegram_id: userId,
        group_id: groupId
    }, {
        upsert: true
    });

    await bot.sendMessage(chatId, `Ваша группа: ${groupName}`);
}

module.exports = {
    initialize: async () => {
        const groups = await api.groups();
        groupsInfo = groupsInfo.withMutations(mutable => {
            for (const [index, item] of groups.entries()) {
                const info = getFacultyInfo(item);
                mutable.set(index, info);
            }
        });
    },

    // callback data format: [action, ...data]
    process: async (callbackData, userId, chatId, bot) => {
        const [action, ...data] = callbackData;
        switch (action) {
        case callback_actions.ON_FACULTY_SELECT:
            await commandOnSelectFaculty(data, userId, chatId, bot);
            break;
        case callback_actions.ON_SPECIALITY_SELECT:
            await commandOnSelectSpec(data, userId, chatId, bot);
            break;
        case callback_actions.ON_COURSE_SELECT:
            await commandOnSelectCourse(data, userId, chatId, bot);
            break;
        case callback_actions.ON_GROUP_SELECT:
            await commandOnSelectGroup(data, userId, chatId, bot);
            break;
        }
    },

    getFaculties: () => {
        return Array
            .from(groupsInfo.entries())
            .map(([index, info]) => ({
                index,
                name: info.get('name')
            }));
    }
};