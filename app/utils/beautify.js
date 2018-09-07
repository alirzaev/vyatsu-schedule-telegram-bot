function zip(...arrays) {
    const minLength = Math.min(...(arrays.map(array => array.length)));

    const iterable = {};
    iterable[Symbol.iterator] = function* () {
        for (let i = 0; i < minLength; ++i) {
            const items = arrays.map(array => array[i]);

            yield items;
        }
    };

    return Array.of(...iterable);
}

module.exports = {

    lessons: (lessons) => lessons.map(lesson => lesson
        .replace('\r', ' ')
        .replace(/Чтение ?лекций/im, 'Лек.')
        .replace(/Проведение ?лабораторных ?занятий/im, 'Лаб.')
        .replace(/Проведение ?практических ?занятий,? ?семинаров/im, 'Пр.')
        .replace(/^([А-Яа-я]+-\d{4}-\d{2}-\d{2}, )/im, '')     // remove the group name from the lesson's description
        .replace(/\s?([А-Яа-я]+-\d{4}-\d{2}-\d{2}, )/gim, '; ') // first occurrence replace to empty string, others to semicolon
    ),

    rings: (rings) => rings.map((rings, index) => `${index + 1}) ${rings.start}-${rings.end}`),

    schedule: (rings, lessons) => zip(rings, lessons).map(v => `*${v[0].start} >* ${v[1]}`)

};
