// ===== Simulation Page =====

// State
let simQuestions = [];
let simIndex = 0;
let simAnswers = {};
let simTimer = null;
let simTimeRemaining = 0;
let simStartTime = null;
let simConfig = {
    totalQuestions: 80,
    ch1Percent: 20,
    ch2Percent: 40,
    ch3Percent: 40,
    timeLimit: 60,
    shuffleQuestions: true,
    shuffleAnswers: true,
    showAnswerImmediately: false
};

// DOM Elements
let simulationConfig, simulationExam, simulationResult;
let simTotalQuestions, simCh1Percent, simCh2Percent, simCh3Percent;
let simCh1Count, simCh2Count, simCh3Count, simTotalPercent, distWarning;
let simTimeLimit, simShuffleQuestions, simShuffleAnswers, simShowAnswerImmediately, simShowAIExplanation;
let startSimulationBtn, simTimerEl, simTimerValue, simCurrentSpan, simTotalSpan;
let simSubmitBtn, simProgress, simQuestionNav, simQuestionContainer;
let simQuestionNumber, simQuestionText, simOptions, simExplanation;
let simPrevBtn, simNextBtn;
let simResultEmoji, simResultScore, simResultCorrect, simResultIncorrect, simResultSkipped, simResultTime;
let simReviewBtn, simRetryBtn;

async function initSimulation() {
    await loadAllData();
    initSimulationElements();
    initSimulationEventListeners();
    updateDistributionCounts();
}

function initSimulationElements() {
    simulationConfig = document.getElementById('simulation-config');
    simulationExam = document.getElementById('simulation-exam');
    simulationResult = document.getElementById('simulation-result');

    simTotalQuestions = document.getElementById('sim-total-questions');
    simCh1Percent = document.getElementById('sim-ch1-percent');
    simCh2Percent = document.getElementById('sim-ch2-percent');
    simCh3Percent = document.getElementById('sim-ch3-percent');
    simCh1Count = document.getElementById('sim-ch1-count');
    simCh2Count = document.getElementById('sim-ch2-count');
    simCh3Count = document.getElementById('sim-ch3-count');
    simTotalPercent = document.getElementById('sim-total-percent');
    distWarning = document.getElementById('dist-warning');
    simTimeLimit = document.getElementById('sim-time-limit');
    simShuffleQuestions = document.getElementById('sim-shuffle-questions');
    simShuffleAnswers = document.getElementById('sim-shuffle-answers');
    simShowAnswerImmediately = document.getElementById('sim-show-answer-immediately');
    simShowAIExplanation = document.getElementById('sim-show-ai-explanation');
    startSimulationBtn = document.getElementById('start-simulation-btn');

    simTimerEl = document.getElementById('sim-timer');
    simTimerValue = document.getElementById('sim-timer-value');
    simCurrentSpan = document.getElementById('sim-current');
    simTotalSpan = document.getElementById('sim-total');
    simSubmitBtn = document.getElementById('sim-submit-btn');
    simProgress = document.getElementById('sim-progress');
    simQuestionNav = document.getElementById('sim-question-nav');
    simQuestionContainer = document.getElementById('sim-question-container');
    simQuestionNumber = document.getElementById('sim-question-number');
    simQuestionText = document.getElementById('sim-question-text');
    simOptions = document.getElementById('sim-options');
    simExplanation = document.getElementById('sim-explanation');
    simPrevBtn = document.getElementById('sim-prev-btn');
    simNextBtn = document.getElementById('sim-next-btn');

    simResultEmoji = document.getElementById('sim-result-emoji');
    simResultScore = document.getElementById('sim-result-score');
    simResultCorrect = document.getElementById('sim-result-correct');
    simResultIncorrect = document.getElementById('sim-result-incorrect');
    simResultSkipped = document.getElementById('sim-result-skipped');
    simResultTime = document.getElementById('sim-result-time');
    simReviewBtn = document.getElementById('sim-review-btn');
    simRetryBtn = document.getElementById('sim-retry-btn');
}

function initSimulationEventListeners() {
    // Config inputs
    [simTotalQuestions, simCh1Percent, simCh2Percent, simCh3Percent].forEach(input => {
        input?.addEventListener('input', updateDistributionCounts);
    });

    startSimulationBtn?.addEventListener('click', startSimulation);
    simSubmitBtn?.addEventListener('click', submitSimulation);
    simPrevBtn?.addEventListener('click', () => simNavigate(-1));
    simNextBtn?.addEventListener('click', () => simNavigate(1));
    simReviewBtn?.addEventListener('click', reviewSimulation);
    simRetryBtn?.addEventListener('click', resetSimulation);
}

function updateDistributionCounts() {
    const total = parseInt(simTotalQuestions?.value) || 80;
    const ch1 = parseInt(simCh1Percent?.value) || 0;
    const ch2 = parseInt(simCh2Percent?.value) || 0;
    const ch3 = parseInt(simCh3Percent?.value) || 0;
    const sum = ch1 + ch2 + ch3;

    const ch1Count = Math.round(total * ch1 / 100);
    const ch2Count = Math.round(total * ch2 / 100);
    const ch3Count = total - ch1Count - ch2Count;

    if (simCh1Count) simCh1Count.textContent = `${ch1Count} câu`;
    if (simCh2Count) simCh2Count.textContent = `${ch2Count} câu`;
    if (simCh3Count) simCh3Count.textContent = `${ch3Count} câu`;

    if (simTotalPercent) {
        simTotalPercent.querySelector('span').textContent = `Tổng: ${sum}%`;
    }

    if (distWarning) {
        distWarning.classList.toggle('hidden', sum === 100);
    }

    if (startSimulationBtn) {
        startSimulationBtn.disabled = sum !== 100;
    }
}

function startSimulation() {
    simConfig = {
        totalQuestions: parseInt(simTotalQuestions?.value) || 80,
        ch1Percent: parseInt(simCh1Percent?.value) || 20,
        ch2Percent: parseInt(simCh2Percent?.value) || 40,
        ch3Percent: parseInt(simCh3Percent?.value) || 40,
        timeLimit: parseInt(simTimeLimit?.value) || 60,
        shuffleQuestions: simShuffleQuestions?.checked ?? true,
        shuffleAnswers: simShuffleAnswers?.checked ?? true,
        showAnswerImmediately: simShowAnswerImmediately?.checked ?? false,
        showAIExplanation: simShowAIExplanation?.checked ?? true
    };

    const sum = simConfig.ch1Percent + simConfig.ch2Percent + simConfig.ch3Percent;
    if (sum !== 100) {
        alert('Tổng phần trăm các chương phải bằng 100%');
        return;
    }

    // Calculate question counts
    const ch1Count = Math.round(simConfig.totalQuestions * simConfig.ch1Percent / 100);
    const ch2Count = Math.round(simConfig.totalQuestions * simConfig.ch2Percent / 100);
    const ch3Count = simConfig.totalQuestions - ch1Count - ch2Count;

    // Get questions
    const ch1Questions = [...getQuestionsByChapter(1)];
    const ch2Questions = [...getQuestionsByChapter(2)];
    const ch3Questions = [...getQuestionsByChapter(3)];

    shuffleArray(ch1Questions);
    shuffleArray(ch2Questions);
    shuffleArray(ch3Questions);

    const selected = [
        ...ch1Questions.slice(0, ch1Count),
        ...ch2Questions.slice(0, ch2Count),
        ...ch3Questions.slice(0, ch3Count)
    ];

    if (simConfig.shuffleQuestions) {
        shuffleArray(selected);
    }

    // Prepare shuffled options
    simQuestions = selected.map(q => {
        const newQ = { ...q };
        if (simConfig.shuffleAnswers) {
            let options = [...q.options];
            shuffleArray(options);
            const letters = ['A', 'B', 'C', 'D'];
            options = options.map((opt, i) => ({
                ...opt,
                originalLetter: opt.letter,
                letter: letters[i]
            }));
            newQ._shuffledOptions = options;
            newQ._shuffledCorrect = options.find(o => o.originalLetter === q.correct_answer)?.letter || q.correct_answer;
        } else {
            newQ._shuffledOptions = q.options;
            newQ._shuffledCorrect = q.correct_answer;
        }
        return newQ;
    });

    simIndex = 0;
    simAnswers = {};
    simTimeRemaining = simConfig.timeLimit * 60;
    simStartTime = Date.now();

    // Switch screens
    simulationConfig?.classList.add('hidden');
    simulationResult?.classList.add('hidden');
    simulationExam?.classList.remove('hidden');

    if (simTotalSpan) simTotalSpan.textContent = simQuestions.length;

    renderSimQuestionNav();
    renderSimQuestion();
    startSimTimer();
}

function startSimTimer() {
    if (simTimer) clearInterval(simTimer);
    updateSimTimerDisplay();

    simTimer = setInterval(() => {
        simTimeRemaining--;
        updateSimTimerDisplay();

        if (simTimeRemaining <= 0) {
            clearInterval(simTimer);
            simTimer = null;
            submitSimulation();
        }
    }, 1000);
}

function updateSimTimerDisplay() {
    const minutes = Math.floor(simTimeRemaining / 60);
    const seconds = simTimeRemaining % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (simTimerValue) simTimerValue.textContent = timeStr;

    if (simTimerEl) {
        simTimerEl.classList.remove('warning', 'danger');
        if (simTimeRemaining <= 60) {
            simTimerEl.classList.add('danger');
        } else if (simTimeRemaining <= 300) {
            simTimerEl.classList.add('warning');
        }
    }
}

function renderSimQuestionNav() {
    if (!simQuestionNav) return;

    simQuestionNav.innerHTML = simQuestions.map((_, i) => {
        let classes = 'q-nav-btn';
        if (i === simIndex) classes += ' current';
        if (simAnswers[i] !== undefined) classes += ' answered';
        return `<button class="${classes}" data-index="${i}">${i + 1}</button>`;
    }).join('');

    simQuestionNav.querySelectorAll('.q-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            simIndex = parseInt(btn.dataset.index);
            renderSimQuestion();
            renderSimQuestionNav();
        });
    });
}

function renderSimQuestion() {
    const q = simQuestions[simIndex];
    if (!q) return;

    if (simQuestionNumber) simQuestionNumber.textContent = `Câu ${simIndex + 1}`;
    if (simCurrentSpan) simCurrentSpan.textContent = simIndex + 1;
    if (simQuestionText) simQuestionText.innerHTML = q.text;

    const progress = ((simIndex + 1) / simQuestions.length) * 100;
    if (simProgress) simProgress.style.width = `${progress}%`;

    const options = q._shuffledOptions || q.options;
    const correctAnswer = q._shuffledCorrect || q.correct_answer;
    const userAnswer = simAnswers[simIndex];
    const answered = userAnswer !== undefined;
    const showFeedback = answered && simConfig.showAnswerImmediately;

    if (simOptions) {
        simOptions.innerHTML = options.map(opt => {
            let classes = 'option';
            let icon = '';

            if (showFeedback) {
                classes += ' disabled';
                if (opt.letter === correctAnswer) {
                    classes += ' correct';
                    icon = '<span class="option-icon">✓</span>';
                } else if (opt.letter === userAnswer) {
                    classes += ' incorrect';
                    icon = '<span class="option-icon">✗</span>';
                }
            } else if (answered && opt.letter === userAnswer) {
                classes += ' selected';
            }

            return `
                <div class="${classes}" data-letter="${opt.letter}">
                    <span class="option-letter">${opt.letter}</span>
                    <span class="option-text">${opt.text}</span>
                    ${icon}
                </div>
            `;
        }).join('');

        if (!showFeedback) {
            simOptions.querySelectorAll('.option').forEach(opt => {
                opt.addEventListener('click', () => selectSimAnswer(opt.dataset.letter));
            });
        }
    }

    // Show explanation if feedback enabled
    if (simExplanation) {
        if (showFeedback && userAnswer !== correctAnswer && q.explanation && simConfig.showAIExplanation) {
            simExplanation.innerHTML = `
                <div class="explanation-box">
                    <div class="explanation-header">
                        <span class="gemini-badge">Gemini 3.0 PRO</span>
                    </div>
                    <div class="explanation-text">${q.explanation}</div>
                </div>
            `;
            simExplanation.classList.remove('hidden');
        } else {
            simExplanation.classList.add('hidden');
        }
    }

    if (simPrevBtn) simPrevBtn.disabled = simIndex === 0;
    if (simNextBtn) simNextBtn.disabled = simIndex === simQuestions.length - 1;
}

function selectSimAnswer(letter) {
    simAnswers[simIndex] = letter;
    renderSimQuestion();
    renderSimQuestionNav();

    if (!simConfig.showAnswerImmediately && simIndex < simQuestions.length - 1) {
        setTimeout(() => simNavigate(1), 300);
    }
}

function simNavigate(direction) {
    const newIndex = simIndex + direction;
    if (newIndex >= 0 && newIndex < simQuestions.length) {
        simIndex = newIndex;
        renderSimQuestion();
        renderSimQuestionNav();
    }
}

function submitSimulation() {
    if (simTimer) {
        clearInterval(simTimer);
        simTimer = null;
    }

    let correct = 0, incorrect = 0, skipped = 0;

    simQuestions.forEach((q, i) => {
        const userAnswer = simAnswers[i];
        const correctAnswer = q._shuffledCorrect || q.correct_answer;

        if (userAnswer === undefined) {
            skipped++;
        } else if (userAnswer === correctAnswer) {
            correct++;
        } else {
            incorrect++;
        }
    });

    const total = simQuestions.length;
    const score = Math.round((correct / total) * 10 * 10) / 10;
    const timeTaken = Math.floor((Date.now() - simStartTime) / 1000);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    let emoji = '😢';
    if (score >= 9) emoji = '🏆';
    else if (score >= 8) emoji = '🎉';
    else if (score >= 7) emoji = '😊';
    else if (score >= 5) emoji = '😐';

    if (simResultEmoji) simResultEmoji.textContent = emoji;
    if (simResultScore) simResultScore.textContent = score.toFixed(1);
    if (simResultCorrect) simResultCorrect.textContent = correct;
    if (simResultIncorrect) simResultIncorrect.textContent = incorrect;
    if (simResultSkipped) simResultSkipped.textContent = skipped;
    if (simResultTime) simResultTime.textContent = timeStr;

    simulationExam?.classList.add('hidden');
    simulationResult?.classList.remove('hidden');

    updateStats({
        studiedToday: total,
        totalAnswered: correct + incorrect,
        totalCorrect: correct
    });
}

function reviewSimulation() {
    simQuestions.forEach((q, i) => {
        const userAnswer = simAnswers[i];
        const correctAnswer = q._shuffledCorrect || q.correct_answer;
        q._reviewed = true;
        q._isCorrect = userAnswer === correctAnswer;
    });

    simulationResult?.classList.add('hidden');
    simulationExam?.classList.remove('hidden');

    if (simTimerEl) simTimerEl.style.display = 'none';
    if (simSubmitBtn) simSubmitBtn.style.display = 'none';

    simConfig.showAnswerImmediately = true;
    renderSimReviewNav();
    simIndex = 0;
    renderSimQuestion();
}

function renderSimReviewNav() {
    if (!simQuestionNav) return;

    simQuestionNav.innerHTML = simQuestions.map((q, i) => {
        const userAnswer = simAnswers[i];
        const correctAnswer = q._shuffledCorrect || q.correct_answer;
        let classes = 'q-nav-btn';

        if (i === simIndex) classes += ' current';
        if (userAnswer === undefined) {
            classes += ' skipped';
        } else if (userAnswer === correctAnswer) {
            classes += ' correct';
        } else {
            classes += ' incorrect';
        }

        return `<button class="${classes}" data-index="${i}">${i + 1}</button>`;
    }).join('');

    simQuestionNav.querySelectorAll('.q-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            simIndex = parseInt(btn.dataset.index);
            renderSimQuestion();
            renderSimReviewNav();
        });
    });
}

function resetSimulation() {
    if (simTimer) {
        clearInterval(simTimer);
        simTimer = null;
    }

    simQuestions = [];
    simIndex = 0;
    simAnswers = {};

    if (simTimerEl) simTimerEl.style.display = '';
    if (simSubmitBtn) simSubmitBtn.style.display = '';

    simulationExam?.classList.add('hidden');
    simulationResult?.classList.add('hidden');
    simulationConfig?.classList.remove('hidden');

    simConfig.showAnswerImmediately = simShowAnswerImmediately?.checked ?? false;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initSimulation);
