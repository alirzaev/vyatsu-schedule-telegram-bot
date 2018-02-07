const BASE_API = process.env.BASE_API;

const dateHelper = require('./helpers/date');

module.exports = function(ctx) {
  const module = {};
  const SUNDAY = 6;

  const { bot, redis, logger, axios } = ctx;

  module.rings = function(onlyStart) {
    onlyStart = onlyStart || false;
    const rings = require('./rings.json')

    return new Promise((resolve, reject) => {
      const times = [];
      rings.forEach((v, i) => {
        if (onlyStart){
          times.push(`${i + 1}) ${v.start}`);
        } else {
          times.push(`${i + 1}) ${v.start}-${v.end}`);
        }
      });
      resolve(times);
    });
  };

  module.currentWeek = function(currentDate) {
    const termStartDate = new Date(process.env.FIRST_WEEK_START);
    // const currentDate = new Date();
    // currentDate.setHours(currentDate.getHours() + 3); // +03
    const timeDiff = Math.abs(currentDate.getTime() - termStartDate.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
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
          return name.search(new RegExp(groupName, "i")) >= 0;
        });
        return similarGroups;
      })
  };

  module.schedule = function(groupId, date, nextDay) {
    nextDay = nextDay || 0;
    nextDay = parseInt(nextDay);
    date.setDate(date.getDate() + nextDay);
    date.setHours(date.getHours() + 3); // +03
    console.log(date);
    console.log(date.getDay());
    console.log((date.getDay() + 6) % 7);
    return redis.getAsync(`cache:schedule:${groupId}`)
      .then(schedule => {
        if (schedule) {
          logger.debug('FROM CACHE');
          return JSON.parse(schedule);
        }
        logger.debug('FROM API');
        return axios.get(`${BASE_API}/schedule/${groupId}/${process.env.SEASON}`).then(res => {
          return res.data;
        });
      })
      .then(schedule => {
        redis.set(`cache:schedule:${groupId}`, JSON.stringify(schedule));
        redis.expireat(`cache:schedule:${groupId}`, dateHelper.nextDayTimestamp());
        let curWeekNumber = module.currentWeek(date) - 1;
        let curDayNumber = (date.getDay() + 6) % 7;
        if (curDayNumber == SUNDAY) {
          date.setDate(date.getDate() + 1);
          curDayNumber = 0;
          curWeekNumber = (curWeekNumber + 1) % 2;
        }
        const curWeek = schedule.weeks[curWeekNumber];
        const cleaningCurDay = curWeek[curDayNumber].map((el) => {
          let mapped = el.replace("\r", ' ')
            .replace(/Чтение ?лекций/im, 'Лек.')
            .replace(/Проведение ?лабораторных ?занятий/im, 'Лаб.')
            .replace(/Проведение ?практических ?занятий,? ?семинаров/im, 'Пр.');
          return mapped.replace(/(.+-\d{4}-\d{2}-\d{2}, )/im, '');
        });
        return { day: cleaningCurDay, date: date, groupId };
      });
  };

  return module;
};