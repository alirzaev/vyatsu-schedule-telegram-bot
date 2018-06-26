const dateHelper = require('./helpers/date')
const timediff = require('timediff')
const axios = require('axios')

const BASE_API = process.env.BASE_API

function parseDate(date) {
    let day = Number.parseInt(date.slice(0, 2))
    let month = Number.parseInt(date.slice(2, 4))
    let year = Number.parseInt(date.slice(4))

    return [day, month, year]
}

function getCurrentDay(firstDate, secondDate) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const OFFSET_MSK = 10800000
    const MODULO = 1209600000
    const DAY_IN_MILLISEC = 24 * 3600 * 1000

    const [fDay, fMonth, fYear] = parseDate(firstDate)
    const [sDay, sMonth, sYear] = parseDate(secondDate)

    firstDate = Date.parse(`${fDay} ${monthNames[fMonth - 1]} ${fYear} 00:00:00 +0300`)
    secondDate = Date.parse(`${sDay} ${monthNames[sMonth - 1]} ${sYear} 00:00:00 +0300`)

    const currentDate = Date.now() + OFFSET_MSK

    const difference = ((currentDate - firstDate + MODULO) % MODULO) / DAY_IN_MILLISEC >> 0
    let cWeek = Math.abs((difference / 7) >> 0)
    let cDay = difference % 7

    if (cWeek > 1) {
        cWeek = (cWeek + 1) % 2
    }
    if (cDay > 5) {
        cDay = (cDay + 1) % 7
        cWeek = (cWeek + 1) % 2
    }
    return [cWeek, cDay]
}

module.exports = {

    getCurrentDay: getCurrentDay,

    getRings: () => {
        const rings = require('./rings.json')

        return rings.map((v, i) => `${i + 1}) ${v.start}-${v.end}`)
    },

    getSchedule: async (groupId) => {
        const date = new Date()
        date.setHours(date.getHours() + 3) // +03

        const res = await axios.get(`${BASE_API}/v1/schedule/${groupId}/${process.env.SEASON}`)

        const { weeks, date_range } = res.data
        const [cWeek, cDay] = getCurrentDay(date_range[0], date_range[1])

        const schedule = weeks[cWeek][cDay].map(
            item => item.replace("\r", ' ')
                .replace(/Чтение ?лекций/im, 'Лек.')
                .replace(/Проведение ?лабораторных ?занятий/im, 'Лаб.')
                .replace(/Проведение ?практических ?занятий,? ?семинаров/im, 'Пр.')
                .replace(/(.+-\d{4}-\d{2}-\d{2}, )/im, '')
        )

        return {
            day: schedule,
            date: date,
            groupId
        }
    }

}