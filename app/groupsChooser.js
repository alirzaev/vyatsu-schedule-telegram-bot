const { buildKeyboard } = require('./keyboard')

const BASE_API = process.env.BASE_API

let groupsInfo = new Map()

function getFacultyShorthand(facultyName) {
    const i = facultyName.indexOf('(')
    if (i != -1) {
        return facultyName.slice(0, i).trim()
    } else {
        return facultyName
    }
}

function getGroupInfo(groupItem) {
    const groupId = groupItem.id
    const groupName = groupItem.name

    m = groupName.match(/([А-Яа-я]+)-(\d+)-\d+-\d+/)
    const spec = m[1].slice(0, -1)
    const course = m[2].slice(0, 1)

    return [groupId, groupName, spec, course]
}

function getFacultyInfo(facultyItem, ind) {
    const facultyName = facultyItem.faculty
    const facultyShorthand = getFacultyShorthand(facultyName)
    const facultyIndex = ind
    const groups = facultyItem.groups

    const facultyInfo = new Map()

    groups.forEach(group => {
        [groupId, groupName, spec, course] = getGroupInfo(group)

        if (!facultyInfo.has(spec)) {
            facultyInfo.set(spec, new Map())
        }

        if (!facultyInfo.get(spec).has(course)) {
            facultyInfo.get(spec).set(course, [])
        }

        facultyInfo.get(spec).get(course).push({
            id: groupId,
            name: groupName
        })
    })

    return {
        name: facultyShorthand,
        index: facultyIndex,
        info: facultyInfo
    }
}

function commandOnSelectFaculty(data, userId, chatId, ctx) {
    const facultyIndex = data.d.f // f - faculty index
    const specs = groupsInfo.get(facultyIndex).get('info')

    const buttons = []
    for (let spec of specs.keys()) {
        buttons.push({
            text: spec,
            callback_data: JSON.stringify({
                t: data.t,
                a: 1, // select spec
                d: {
                    'f': facultyIndex,
                    's': spec
                }
            })
        })
    }
    
    ctx.bot.sendMessage(chatId, 'Выберите специальность', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 3),
            resize_keyboard: true
        },
    })
}

function commandOnSelectSpec(data, userId, chatId, ctx) {
    const facultyIndex = data.d.f
    const spec = data.d.s
    const courses = groupsInfo
        .get(facultyIndex)
        .get('info')
        .get(spec)

    const buttons = []

    for (let course of courses.keys()) {
        buttons.push({
            text: course,
            callback_data: JSON.stringify({
                t: data.t,
                a: 2, // select course
                d: {
                    'f': facultyIndex,
                    's': spec,
                    'c': course
                }
            })
        })
    }

    ctx.bot.sendMessage(chatId, 'Выберите курс', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 2),
            resize_keyboard: true
        },
    })
}

function commandOnSelectCourse(data, userId, chatId, ctx) {
    const facultyIndex = data.d.f
    const spec = data.d.s
    const course = data.d.c

    const groups = groupsInfo
        .get(facultyIndex)
        .get('info')
        .get(spec)
        .get(course)
    
    const buttons = groups.map(group => {
        return {
            text: group.name,
            callback_data: JSON.stringify({
                t: data.t,
                a: 3, // select course
                d: {
                    'f': facultyIndex,
                    's': spec,
                    'c': course,
                    'g': group.id
                }
            })
        }
    })

    ctx.bot.sendMessage(chatId, 'Выберите группу', {
        reply_markup: {
            inline_keyboard: buildKeyboard(buttons, 2),
            resize_keyboard: true
        },
    })
}

function commandOnSelectGroup(data, userId, chatId, ctx) {
    const facultyIndex = data.d.f
    const spec = data.d.s
    const course = data.d.c
    const groupId = data.d.g

    const [group, ...rest] = groupsInfo
        .get(facultyIndex)
        .get('info')
        .get(spec)
        .get(course)
        .filter(group => group.id === groupId)
    
    ctx.redis.set(userId, groupId)
    ctx.bot.sendMessage(chatId, `Ваша группа: ${group.name}`)
}

module.exports = function (ctx) {
    const { bot, redis, logger, axios } = ctx
    axios.get(`${BASE_API}/v2/groups/by_faculty.json`)
        .then(res => res.data.forEach((item, ind) => {
            const { name, index, info } = getFacultyInfo(item, ind)

            groupsInfo.set(index, new Map([
                ['info', info],
                ['name', name]
            ]))
        }))
    
    // a - action
    // d - data (dict)
    module.processChoosing = (data, userId, chatId) => {
        switch (data.a) {
            case 0: //faculty was selected
                commandOnSelectFaculty(data, userId, chatId, ctx)
                break
            case 1: //spec was selected
                commandOnSelectSpec(data, userId, chatId, ctx)
                break
            case 2: //course was selected
                commandOnSelectCourse(data, userId, chatId, ctx)
                break
            case 3: //group was selected
                commandOnSelectGroup(data, userId, chatId, ctx)
                break
        }
    }

    module.getFaculties = () => {
        const faculties = []
        for ([facultyIndex, facultyInfo] of groupsInfo) {
            faculties.push({
                index: facultyIndex,
                name: facultyInfo.get('name')
            })
        }
        return faculties
    }

    return module
}