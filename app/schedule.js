const dateHelper = require('./helpers/date');
const timediff = require('timediff');

const BASE_API = process.env.BASE_API;

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
  const cWeek = Math.abs((difference / 7) >> 0)
  const cDay = difference % 7

  if (cWeek > 1) {
    cWeek = (cWeek + 1) % 2
  }
  if (cDay > 6) {
    cDay = (cDay + 1) % 6
    cWeek = (cWeek + 1) % 2
  }
  return [cWeek, cDay]
}

module.exports = function(ctx) {
  const module = {};
  const SUNDAY = 6;

  const { bot, redis, logger, axios } = ctx;

  module.getCurrentDay = getCurrentDay;

  module.getRings = () => {
    const rings = require('./rings.json')

    return new Promise((resolve, reject) => {
      const times = [];
      rings.forEach((v, i) => {
          times.push(`${i + 1}) ${v.start}-${v.end}`);
      });
      resolve(times);
    });
  };

  module.currentWeek = function(currentDate) {
    const termStartDate = new Date(process.env.FIRST_WEEK_START);
    const diffDays = timediff(termStartDate, currentDate, 'D').days;
    return Math.floor(diffDays / 7) % 2 + 1;
  };

  module.detectGroup = function(groupName) {
    return redis.getAsync('cache:groups')
      .then(groups => {
        if (groups) {
          return JSON.parse(groups);
        }
        return axios.get(`${BASE_API}/v2/groups.json`).then(res => {
          return res.data;
        });
      })
      .then(groups => {
        redis.set('cache:groups', JSON.stringify(groups), 'EX', 3600); // Update expire 1 hour
        const similarGroups = groups.filter(g => {
          groupName = groupName.trim().split('-').join('');
          const name = g.name.trim().split('-').join('');
          return name.search(new RegExp(groupName, 'i')) >= 0;
        });
        return similarGroups;
      })
  };

  module.getSchedule = (groupId, date, nextDay) => {
    nextDay = nextDay || 0;
    nextDay = parseInt(nextDay);
    date.setDate(date.getDate() + nextDay);
    date.setHours(date.getHours() + 3); // +03
    return axios.get(`${BASE_API}/schedule/${groupId}/${process.env.SEASON}`)
      .then(res => res.data)
      .then(schedule => {
        const { weeks, _, date_range } = schedule
        const [ cWeek, cDay ] = getCurrentDay(date_range[0], date_range[1])

        const curWeek = schedule.weeks[cWeek];
        const cleaningCurDay = weeks[cWeek][cDay].map(
          item => item.replace("\r", ' ')
            .replace(/Чтение ?лекций/im, 'Лек.')
            .replace(/Проведение ?лабораторных ?занятий/im, 'Лаб.')
            .replace(/Проведение ?практических ?занятий,? ?семинаров/im, 'Пр.')
            .replace(/(.+-\d{4}-\d{2}-\d{2}, )/im, '')
        );
        return {
          day: cleaningCurDay,
          date: date,
          groupId
        };
      });
  };

  return module;
};