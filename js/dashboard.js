// ===== Dashboard Page =====

async function initDashboard() {
    // Ensure subject config is loaded first
    await loadSubjectsList();
    await loadCurrentSubjectConfig();

    await loadAllData();
    updateDashboard();
}

function updateDashboard() {
    // Update chapter counts
    const totalQuestions = document.getElementById('total-questions');
    const studiedToday = document.getElementById('studied-today');
    const accuracyRate = document.getElementById('accuracy-rate');

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
