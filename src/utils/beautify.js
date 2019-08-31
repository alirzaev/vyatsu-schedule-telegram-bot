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
        .replace(/Лекция/im, 'Лек.')
        .replace(/Лабораторная работа/im, 'Лаб.')
        .replace(/Практическое занятие/im, 'Пр.')
        .replace(/^([А-Яа-я]+-\d{4}-\d{2}-\d{2}, )/im, '\n   ')     // replace group name with 3 spaces
        .replace(/\s?([А-Яа-я]+-\d{4}-\d{2}-\d{2}, )/gim, ';\n   ') // for indentation
        .replace(/_/gim, '') // escape markdown characters
        .replace(/\*/gim, '')
        .replace(/\[/gim, '')
        .replace(/`/gim, '')
    ),

    rings: (rings) => rings.map((rings, index) => `${index + 1}) ${rings.start}-${rings.end}`),

    schedule: (rings, lessons) => zip(rings, lessons)
        .filter(v => v[1] !== '') // skip items without lessons
        .map(v => `*${v[0].start} >* ${v[1]}`)

};
