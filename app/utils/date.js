const weekday = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

module.exports = {

    dayName: function (date) {
        return weekday[date.getDay()]
    }

};
