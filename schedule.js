const ENV = process.env.NODE_ENV || 'development';
if (ENV == 'development') require('dotenv').config();

const BASE_API = process.env.BASE_API;
const axios = require('axios');

module.exports = {
  rings: function() {
    return new Promise((resolve, reject) => {
      axios.get(`${BASE_API}/v2/calls`).then(res => {
        const rings = [];
        res.data.forEach((v, i) => {
          rings.push(`${i + 1}) ${v.start}-${v.end}`);
        });
        resolve(rings);
      }).catch(err => { reject(err); });
    });
  },

  currentWeek: function() {
    const termStartDate = new Date(process.env.FIRST_WEEK_START);
    const currentDate = new Date();
    const timeDiff = Math.abs(currentDate.getTime() - termStartDate.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.floor(diffDays / 7) % 2 + 1;
  },

  detectGroup: function(groupName) {
    return new Promise((resolve, reject) => {
      axios.get(`${BASE_API}/v2/groups.json`).then(res => {
        const similarGroups = res.data.filter(g => {
          const regExp = new RegExp(groupName, "i");
          return g.name.search(regExp) >= 0;
        });
        resolve(similarGroups);
      }).catch(err => { reject(err); });
    });
  },

  schedule: function(groupId) {
    return new Promise((resolve, reject) => {
      axios.get(`${BASE_API}/schedule/${groupId}/${process.env.SEASON}`).then(res => {
        let curWeekNumber = this.currentWeek();
        let date = new Date();
        let curDayNumber = (date.getDay() + 6) % 7;
        // If sunday then go to mon of next week
        if (curDayNumber == 6) {
          date.setDate(date.getDate() + 1);
          curDayNumber = 0;
          curWeekNumber = (curWeekNumber + 1) % 2;
        }
        const curWeek = res.data.weeks[curWeekNumber]
        resolve({ day: curWeek[curDayNumber], date: date });
      }).catch(err => { reject(err); })
    });
  }
};
