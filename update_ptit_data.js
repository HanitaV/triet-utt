const fs = require('fs');
const filePath = 'subjects/ptit/phap-luat-dai-cuong/study_data.json';

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawData);

    // Distribution Logic
    const distributions = {
        1: { "1": range(1, 56) },
        2: { "1": range(57, 112) },
        3: { "1": range(113, 168) },
        4: { "2": range(1, 40) },
        5: { "2": range(41, 80), "3": range(1, 5) },
        6: { "2": range(81, 122), "3": range(6, 10) },
        7: { "3": range(11, 30), "4": range(1, 10) },
        8: { "3": range(31, 48), "4": range(11, 20) },
        9: { "4": range(21, 33), "5": range(1, 30) },
        10: { "5": range(31, 60) },
        11: { "6": range(1, 2) },
        12: { "7": range(1, 12) },
        13: { "7": range(13, 25) },
        14: { "7": range(26, 37) }
    };

    data = data.map(topic => {
        if (distributions[topic.id]) {
            topic.questionIds = distributions[topic.id];
        }
        return topic;
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    console.log('Successfully updated study_data.json');

} catch (err) {
    console.error('Error:', err);
}
