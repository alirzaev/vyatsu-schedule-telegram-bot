const axios = require('axios');

const BASE_API = process.env.BASE_API;

module.exports = {

    getSchedule: async (groupId) => {
        const date = new Date();
        date.setHours(date.getHours() + 3); // +03

        const res = await axios.get(`${BASE_API}/v2/schedule/${groupId}/${process.env.SEASON}`);

        const {weeks, today} = res.data;
        const {week, dayOfWeek} = today;

        const schedule = weeks[week][dayOfWeek].map(
            item => item.replace('\r', ' ')
                .replace(/Чтение ?лекций/im, 'Лек.')
                .replace(/Проведение ?лабораторных ?занятий/im, 'Лаб.')
                .replace(/Проведение ?практических ?занятий,? ?семинаров/im, 'Пр.')
                .replace(/(.+-\d{4}-\d{2}-\d{2}, )/im, '')
        );

        return {
            day: schedule,
            date: date,
            groupId
        };
    }

};