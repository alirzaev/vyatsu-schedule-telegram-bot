const weekday = [ 'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб' ];

module.exports = {
  dayName: function(date) {
    return weekday[date.getDay()]
  },

  nextDayTimestamp: function() {
    let date = new Date();
    date.setDate(date.getDate() + 1); // + 1 day
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    return parseInt(date.getTime() / 1000, 10) 
  }
};
