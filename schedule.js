const ENV = process.env.NODE_ENV || 'development';
if (ENV == 'development') require('dotenv').config();

const BASE_API = process.env.BASE_API;
const axios = require('axios');

module.exports = {
  rings: function(onlyStart) {
    onlyStart = onlyStart || false;
    return new Promise((resolve, reject) => {
      axios.get(`${BASE_API}/v2/calls`).then(res => {
        const rings = [];
        res.data.forEach((v, i) => {
          if (onlyStart){
            rings.push(`${i + 1}) ${v.start}`);
          } else {
            rings.push(`${i + 1}) ${v.start}-${v.end}`);
          }
        });
        resolve(rings);
      }).catch(err => { reject(err); });
    });
  },

  currentWeek: function() {
    const termStartDate = new Date(process.env.FIRST_WEEK_START);
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 3); // +03
    const timeDiff = Math.abs(currentDate.getTime() - termStartDate.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.floor(diffDays / 7) % 2 + 1;
  },

  detectGroup: function(groupName) {
    
    return new Promise((resolve, reject) => {
      axios.get(`${BASE_API}/v2/groups.json`).then(res => {
        const similarGroups = res.data.filter(g => {
          groupName = groupName.trim().replace('-', '');
          const name = g.name.trim().replace('-', '');
          const regExp = new RegExp(groupName, "i");
          return name.search(regExp) >= 0;
        });
        resolve(similarGroups);
      }).catch(err => { reject(err); });
    });
  },

  schedule: function(groupId) {
    return new Promise((resolve, reject) => {
      axios.get(`${BASE_API}/schedule/${groupId}/${process.env.SEASON}`).then(res => {
        let curWeekNumber = this.currentWeek() - 1;
        let date = new Date();
        date.setHours(date.getHours() + 3); // +03
        let curDayNumber = (date.getDay() + 6) % 7;
        console.log(`AHTUNG! ${date}`);
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
            .replace(/Проведение ?лабораторных ?занятий/im, 'Лаб.');
          return mapped.replace(/(.+-\d{4}-\d{2}-\d{2}, )/im, '');
        });
        resolve({ day: cleaningCurDay, date: date });
      }).catch(err => { reject(err); })
    });
  }
};