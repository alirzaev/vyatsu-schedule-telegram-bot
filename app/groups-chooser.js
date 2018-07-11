const axios = require('axios');
const { buildKeyboard } = require('./keyboard');
const userPreferences = require('./models/UserPreferences');
const {callback_actions, callback_types} = require('./static/constants');

const BASE_API = process.env.BASE_API;

let groupsInfo = new Map();

class FacultyInfo {
    constructor(name, index, specialities) {
        this._name = name;
        this._index = index;
        this._specialities = specialities;
    }

    get name() {
        return this._name;
    }

    get index() {
        return this._index;
    }

    get specialities() {
        return this._specialities;
    }
}

class GroupInfo {
    constructor(id, name, specialty, course) {
        this._id = id;
        this._name = name;
        this._speciality = specialty;
        this._course = course;
    }

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    get speciality() {
        return this._speciality;
    }

    get course() {
        return this._course;
    }
}

class SpecialityInfo {
    constructor(name, index, courses) {
        this._name = name;
        this._index = index;
        this._courses = courses;
    }

    get name() {
        return this._name;
    }

    get index() {
        return this._index;
    }

    get courses() {
        return this._courses;
    }
}

class CourseInfo {
    constructor(name, index, groups) {
        this._name = name;
        this._index = index;
        this._groups = groups;
    }

    get name() {
        return this._name;
    }

    get index() {
        return this._index;
    }

    get groups() {
        return this._groups;
    }
}

function getFacultyShorthand(facultyName) {
    const i = facultyName.indexOf('(');
    if (i !== -1) {
        return facultyName.slice(0, i).trim();
    } else {
        return facultyName;
    }
}

function getGroupInfo(groupItem) {
    const groupId = groupItem['id'];
    const groupName = groupItem['name'];

    const match = groupName.match(/([А-Яа-я]+)-(\d+)-\d+-\d+/);
    const spec = match[1].slice(0, -1);
    const course = Number.parseInt(match[2].slice(0, 1));

    return new GroupInfo(groupId, groupName, spec, course);
}

function getFacultyInfo(facultyItem, ind) {
    const facultyName = facultyItem['faculty'];
    const facultyShorthand = getFacultyShorthand(facultyName);
    const facultyIndex = ind;
    const groups = facultyItem['groups'];

    const specialities = new Map();
    const specialityIndexes = new Map();
    let counter = 0;

    groups.forEach(group => {
        const groupInfo = getGroupInfo(group);
        const speciality = groupInfo.speciality;
        const course = groupInfo.course;

        if (!specialityIndexes.has(speciality)) {
            specialityIndexes.set(speciality, counter);
            specialities.set(counter, new SpecialityInfo(speciality, counter, new Map()));
            counter++;
        }

        const specialityIndex = specialityIndexes.get(speciality);

        if (!specialities
            .get(specialityIndex)
            .courses
            .has(course)) {
            specialities
                .get(specialityIndex)
                .courses
                .set(course, new CourseInfo(course.toString(), course, new Map()));
        }

        specialities
            .get(specialityIndex)
            .courses
            .get(course)
            .groups
            .set(groupInfo.id, groupInfo);
    });

    return new FacultyInfo(
        facultyShorthand,
        facultyIndex,
        specialities
    );
}

// action data format: [facultyIndex, ...data]
async function commandOnSelectFaculty(actionData, userId, chatId, bot) {
    const [facultyIndex] = actionData;
    const specialities = groupsInfo.get(facultyIndex).specialities;

    const buttons = [];

    for (let [specialityIndex, info] of specialities.entries()) {
        buttons.push({
            text: info.name,
            callback_data: JSON.stringify([
                callback_types.CHOOSE_GROUP,
                callback_actions.ON_SPECIALITY_SELECT,
                facultyIndex,
                specialityIndex
            ])
        });
    }
    
    await bot.sendMessage(chatId, 'Выберите специальность', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 3),
            resize_keyboard: true
        },
    });
}

// action data format: [facultyIndex, specialityIndex, ...data]
async function commandOnSelectSpec(actionData, userId, chatId, bot) {
    const [facultyIndex, specialityIndex] = actionData;
    const courses = groupsInfo
        .get(facultyIndex)
        .specialities
        .get(specialityIndex)
        .courses;

    const buttons = [];

    for (let [courseIndex, info] of courses.entries()) {
        buttons.push({
            text: info.name,
            callback_data: JSON.stringify([
                callback_types.CHOOSE_GROUP,
                callback_actions.ON_COURSE_SELECT,
                facultyIndex,
                specialityIndex,
                courseIndex
            ])
        });
    }

    await bot.sendMessage(chatId, 'Выберите курс', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 2),
            resize_keyboard: true
        },
    });
}

// action data format: [facultyIndex, specialityIndex, courseIndex, ...data]
async function commandOnSelectCourse(actionData, userId, chatId, bot) {
    const [facultyIndex, specialityIndex, courseIndex] = actionData;

    const groups = groupsInfo
        .get(facultyIndex)
        .specialities
        .get(specialityIndex)
        .courses
        .get(courseIndex)
        .groups;
    
    const buttons = [];

    for (let [groupId, info] of groups.entries()) {
        buttons.push({
            text: info.name,
            callback_data: JSON.stringify([
                callback_types.CHOOSE_GROUP,
                callback_actions.ON_GROUP_SELECT,
                facultyIndex,
                specialityIndex,
                courseIndex,
                groupId
            ])
        });
    }

    await bot.sendMessage(chatId, 'Выберите группу', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 2),
            resize_keyboard: true
        },
    });
}

// action data format: [facultyIndex, specialityIndex, courseIndex, groupId, ...data]
async function commandOnSelectGroup(actionData, userId, chatId, bot) {
    const [facultyIndex, specialityIndex, courseIndex, groupId] = actionData;

    const group = groupsInfo
        .get(facultyIndex)
        .specialities
        .get(specialityIndex)
        .courses
        .get(courseIndex)
        .groups
        .get(groupId);

    await userPreferences.replaceOne({
        telegram_id: userId
    }, {
        telegram_id: userId,
        group_id: groupId
    }, {
        upsert: true
    });

    await bot.sendMessage(chatId, `Ваша группа: ${group.name}`);
}

module.exports = {
    initialize: async () => {
        const res = await axios.get(`${BASE_API}/v2/groups/by_faculty`);
        res.data.forEach((item, ind) => {
            const info = getFacultyInfo(item, ind);
            groupsInfo.set(info.index, info);
        });
    },

    // callback data format: [action, ...data]
    processChoosing: async (callbackData, userId, chatId, bot) => {
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
        const faculties = [];
        for (const [facultyIndex, facultyInfo] of groupsInfo) {
            faculties.push({
                index: facultyIndex,
                name: facultyInfo.name
            });
        }
        return faculties;
    }
};