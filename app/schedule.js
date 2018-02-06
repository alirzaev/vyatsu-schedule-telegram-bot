const BASE_API = process.env.BASE_API;
const axios = require('axios');

module.exports = function(ctx) {
  const module = {};

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

  module.currentWeek = function() {
    const termStartDate = new Date(process.env.FIRST_WEEK_START);
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 3); // +03
    const timeDiff = Math.abs(currentDate.getTime() - termStartDate.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.floor(diffDays / 7) % 2 + 1;
  };

  module.detectGroup = function(groupName) {
    return new Promise((resolve, reject) => {
      axios.get(`${BASE_API}/v2/groups.json`).then(res => {
        const similarGroups = res.data.filter(g => {
          groupName = groupName.trim().split('-').join('');
          const name = g.name.trim().split('-').join('');
          const regExp = new RegExp(groupName, "i");
          return name.search(regExp) >= 0;
        });
        resolve(similarGroups);
      }).catch(err => { reject(err); });
    });
  };

  module.schedule = function(groupId, nextDay) {
    nextDay = nextDay || 0;
    nextDay = parseInt(nextDay);
    return new Promise((resolve, reject) => {
      axios.get(`${BASE_API}/schedule/${groupId}/${process.env.SEASON}`).then(res => {
        let curWeekNumber = module.currentWeek() - 1;
        let date = new Date();
        date.setDate(date.getDate() + nextDay);
        date.setHours(date.getHours() + 3); // +03
        let curDayNumber = (date.getDay() + 6) % 7;
        // If sunday then go to mon of next week
        if (curDayNumber == 6) {
          date.setDate(date.getDate() + 1);
          curDayNumber = 0;
          curWeekNumber = (curWeekNumber + 1) % 2;
        }
        const curWeek = res.data.weeks[curWeekNumber]
        const cleaningCurDay = curWeek[curDayNumber].map((el) => {
          let mapped = el.replace("\r", ' ')
            .replace(/Чтение ?лекций/im, 'Лек.')
            .replace(/Проведение ?лабораторных ?занятий/im, 'Лаб.')
            .replace(/Проведение ?практических ?занятий,? ?семинаров/im, 'Лаб.');
          return mapped.replace(/(.+-\d{4}-\d{2}-\d{2}, )/im, '');
        });
        resolve({ day: cleaningCurDay, date: date, groupId });
      }).catch(err => { reject(err); })
    });
  };

  return module;
};