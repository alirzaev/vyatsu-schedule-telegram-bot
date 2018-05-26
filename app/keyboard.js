module.exports = {
    standardKeyboard: {
        keyboard: [['Звонки', 'Расписание'], ['Выбрать группу', 'Помощь'], ['Посмотреть на сайте']],
        resize_keyboard: true
    },

    buildKeyboard: (buttons, columnsCount) => {
        columnsCount = columnsCount || 1
        const keyboard = []

        for (let [index, button] of buttons.entries()) {
            if (index % columnsCount == 0) {
                keyboard.push([button])
            } else {
                keyboard[(index / columnsCount) >> 0].push(button)
            }
        }

        return keyboard
    }
}