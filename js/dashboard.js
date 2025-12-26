// ===== Dashboard Page =====

async function initDashboard() {
    await loadAllData();
    updateDashboard();
}

function updateDashboard() {
    // Update chapter counts
    const counts = { 1: 0, 2: 0, 3: 0 };
    quizData.chapters.forEach(ch => {
        counts[ch.chapter] = ch.questions.length;
    });

    const ch1Count = document.getElementById('ch1-count');
    const ch2Count = document.getElementById('ch2-count');
    const ch3Count = document.getElementById('ch3-count');
    const totalQuestions = document.getElementById('total-questions');
    const studiedToday = document.getElementById('studied-today');
    const accuracyRate = document.getElementById('accuracy-rate');

    if (ch1Count) ch1Count.textContent = `${counts[1]} câu`;
    if (ch2Count) ch2Count.textContent = `${counts[2]} câu`;
    if (ch3Count) ch3Count.textContent = `${counts[3]} câu`;
    if (totalQuestions) totalQuestions.textContent = quizData.questions.length;

    const stats = getStats();
    if (studiedToday) studiedToday.textContent = stats.studiedToday;

    const accuracy = stats.totalAnswered > 0
        ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
        : 0;
    if (accuracyRate) accuracyRate.textContent = `${accuracy}%`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initDashboard);
