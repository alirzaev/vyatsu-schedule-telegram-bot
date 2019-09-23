const addDays = require('date-fns/addDays');
const parse = require('date-fns/parse');
const format = require('date-fns/format');

const weekday = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

module.exports = {

    dayName: function (dayIndex) {
        return weekday[dayIndex];
    },

    advance: function (dayInfo, offset = 1) {
        if (offset === 0) {
            return dayInfo;
        }

        let {week, dayOfWeek, date} = dayInfo;
        if ((dayOfWeek + offset) % 7 === 6) { // Sunday, go to Monday
            offset += 1;
        }

        const day = (week * 7 + dayOfWeek + offset) % 14;
        date = addDays(parse(date, 'ddMMyyyy', new Date()), offset);

        return {
            week: (day / 7) >> 0,
            dayOfWeek: day % 7,
            date: format(date, 'ddMMyyyy')
        };
    }

};
