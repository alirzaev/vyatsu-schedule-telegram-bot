const BASE_API = process.env.BASE_API

let groupsInfo = {}

function getFacultyShorthand(facultyName) {
    const i = facultyName.indexOf('(')
    if (i != -1) {
        return facultyName.slice(0, i).trim()
    } else {
        return facultyName
    }
}

function getGroupInfo(item) {
    const groupId = item['id']
    const groupName = item['name']

    m = groupName.match(/([А-Яа-я]+)-(\d+)-\d+-\d+/)
    const spec = m[1].slice(0, -1)
    const course = m[2].slice(0, 1)

    return [groupId, groupName, spec, course]
}

function getFacultyInfo(item, ind) {
    const facultyName = item['faculty']
    const facultyShorthand = getFacultyShorthand(facultyName)
    const facultyIndex = ind
    const groups = item['groups']

    const facultyInfo = {}

    groups.forEach(group => {
        [groupId, groupName, spec, course] = getGroupInfo(group)

        if (!(spec in facultyInfo)) {
            facultyInfo[spec] = {}
        }

        if (!(course in facultyInfo[spec])) {
            facultyInfo[spec][course] = []
        }

        facultyInfo[spec][course].push({
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
    const facultyIndex = data.d.fi // fi - faculty index
    const specs = groupsInfo[facultyIndex].info

    const buttons = []
    for (const item in specs) {
        if (specs.hasOwnProperty(item)) {
            const spec = item;
            buttons.push({
                text: spec,
                callback_data: JSON.stringify({
                    t: data.t,
                    a: 's', // select spec
                    d: {
                        'fi': facultyIndex,
                        'sp': spec
                    }
                })
            })
        }
    }
    ctx.bot.sendMessage(chatId, 'Выберите специальность', {
        reply_markup: {
            inline_keyboard: [buttons],
            resize_keyboard: true
        },
    })
}

module.exports = function(ctx) {

    const { bot, redis, logger, axios } = ctx

    axios.get(`${BASE_API}/v2/groups/by_faculty.json`)
    .then(res => {
        const data = res.data

        data.forEach((item, ind) => {
            const { name, index, info } = getFacultyInfo(item, ind)
            groupsInfo[index] = {
                info: info,
                name: name
            }
        });
    })

    
    // a - action
    // d - data (dict)
    module.processChoosing = (data, userId, chatId) => {
        switch(data.a) {
            case 'f': //faculty was selected
              commandOnSelectFaculty(data, userId, chatId, ctx)
              break;
            case 's': //spec was selected
        }
    }

    return module;
}