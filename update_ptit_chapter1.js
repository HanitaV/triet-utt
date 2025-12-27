const fs = require('fs');
const path = 'c:/Users/eleven/triet-utt/subjects/ptit/phap-luat-dai-cuong/exam/1.json';

const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Master explanations map (ID -> Explanation)
const masterExplanations = {};

// First pass: Collect explanations from the first 42 questions (assuming they are filled)
// or just use the ones I know are filled (1-64).
// Since the questions repeat every 42, Q(n) should have same explanation as Q(n % 42).
// Adjust for 0-based index or 1-based ID.
// Q1...Q42 are the unique set.

for (let i = 0; i < 42; i++) {
    const q = data.questions[i];
    if (q.explain && q.explain.trim() !== "") {
        masterExplanations[(i + 1)] = q.explain;
    } else {
        console.warn(`Question ${q.id} has no explanation!`);
    }
}

// Second pass: Fill all questions
let updatedCount = 0;
data.questions.forEach((q, index) => {
    // Determine the master ID (1-42) this question corresponds to
    // Logic: Q43 -> Q1. (43-1)%42 + 1 = 1.
    const masterId = ((q.id - 1) % 42) + 1;

    if (masterExplanations[masterId]) {
        // Only update if currently empty (though I can overwrite to be safe/consistent)
        if (!q.explain || q.explain.trim() === "") {
            q.explain = masterExplanations[masterId];
            updatedCount++;
        }
    }
});

console.log(`Updated ${updatedCount} questions.`);

fs.writeFileSync(path, JSON.stringify(data, null, 4), 'utf8');
console.log('File saved.');
