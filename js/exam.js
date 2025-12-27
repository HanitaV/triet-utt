// ===== Exam Page =====

let examQuestions = [];
let examIndex = 0;
let examAnswers = {};
let examScore = 0;
let wrongAnswers = [];
let waitingForContinue = false;
let shuffleAnswers = true;
let hintUsed = false;

// DOM Elements
let examChapterSelect, shuffleAnswersToggle, examQuestionNumber, hintBtn;
let examQuestionText, examOptions, examContinueBtn, examRestartBtn;
let examScoreSpan, examCurrentSpan, examTotalSpan, examCorrectSpan, examIncorrectSpan;
let examProgress, examExplanation, examQuestionContainer;

// Modal Elements
let resultModal, resultEmoji, resultScoreDisplay, resultDetail, resultMessage;
let reviewWrongBtn, modalRestartBtn, backToStudyBtn;

// Practice mode flag
let isPracticeMode = false;

async function initExam() {
    // Wait for common.js initialization to complete if possible, 
    // but better to just ensure we have data we need using the shared functions.
    // They handle being called multiple times generally (caching might be needed if they don't).

    // Actually, loadSubjectsList and loadCurrentSubjectConfig in common.js DO NOT cache the promise, 
    // they just overwrite the global variables. 
    // Since common.js runs on DOMContentLoaded, and this also runs on DOMContentLoaded,
    // we have a race condition on who modifies 'subjectsData' and 'currentSubjectData'.
    // BUT since they are setting the SAME data, it might be fine, just wasteful.

    await loadSubjectsList();
    await loadCurrentSubjectConfig();

    await loadAllData();
    initExamElements();
    populateChapterSelect();
    initExamEventListeners();

    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const isPractice = urlParams.get('practice') === 'true';
    const chapter = urlParams.get('chapter') || 'all';

    if (isPractice) {
        const practiceQuestionsStr = localStorage.getItem('practiceQuestions');
        const practiceTopicName = localStorage.getItem('practiceTopicName');

        if (practiceQuestionsStr) {
            try {
                const practiceQuestions = JSON.parse(practiceQuestionsStr);
                if (practiceQuestions.length > 0) {
                    isPracticeMode = true;
                    // Update title
                    const examTitle = document.getElementById('exam-title');
                    if (examTitle && practiceTopicName) {
                        examTitle.innerHTML = `📝 Luyện tập: ${practiceTopicName}`;
                    }
                    // Hide chapter select in practice mode
                    if (examChapterSelect) {
                        examChapterSelect.parentElement.style.display = 'none';
                    }
                    // Start with practice questions
                    startPracticeExam(practiceQuestions);
                    return;
                }
            } catch (e) {
                console.error('Error loading practice questions:', e);
            }
        }
    }

    if (examChapterSelect) {
        examChapterSelect.value = chapter === 'all' ? 'all' : getChapterFileValue(chapter);
    }

    startExam(chapter);
}

// Populate chapter dropdown based on current subject
function populateChapterSelect() {
    if (!examChapterSelect) return;

    const subjectId = getCurrentSubjectId();

    // Clear existing options
    examChapterSelect.innerHTML = '';

    // Add "All chapters" option
    const totalQuestions = window.quizData.questions.length;
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = `📚 Tất cả chương (${totalQuestions} câu)`;
    examChapterSelect.appendChild(allOption);

    // Add chapter options based on loaded data
    if (currentSubjectData && currentSubjectData.chapters) {
        const basePath = getExamFilesPath();
        currentSubjectData.chapters.forEach((ch, idx) => {
            const chapterQuestions = window.quizData.chapters.find(c => c.chapter === ch.id)?.questions?.length || 0;
            const option = document.createElement('option');
            option.value = `${basePath}/${ch.file}`;
            const icon = ['📘', '📗', '📙', '📕', '📓', '📒', '📔'][idx % 7];
            option.textContent = `${icon} Chương ${ch.id}: ${ch.name} (${chapterQuestions} câu)`;
            examChapterSelect.appendChild(option);
        });
    } else {
        // Fallback for legacy Triet Mac Lenin
        window.quizData.chapters.forEach((ch, idx) => {
            const option = document.createElement('option');
            option.value = ch.file;
            const icon = ['📘', '📗', '📙'][idx % 3];
            option.textContent = `${icon} Chương ${ch.chapter} (${ch.questions.length} câu)`;
            examChapterSelect.appendChild(option);
        });
    }
}

// Helper to get chapter file value from chapter number
function getChapterFileValue(chapter) {
    if (!currentSubjectData || !currentSubjectData.chapters) return null;
    const ch = currentSubjectData.chapters.find(c => c.id === parseInt(chapter));
    if (!ch) return null;
    const basePath = getExamFilesPath();
    return `${basePath}/${ch.file}`;
}



function initExamElements() {
    examChapterSelect = document.getElementById('exam-chapter-select');
    shuffleAnswersToggle = document.getElementById('shuffle-answers-toggle');
    examQuestionNumber = document.getElementById('exam-question-number');
    hintBtn = document.getElementById('hint-btn');
    examQuestionText = document.getElementById('exam-question-text');
    examOptions = document.getElementById('exam-options');
    examContinueBtn = document.getElementById('exam-continue-btn');
    examRestartBtn = document.getElementById('exam-restart-btn');
    examScoreSpan = document.getElementById('exam-score');
    examCurrentSpan = document.getElementById('exam-current');
    examTotalSpan = document.getElementById('exam-total');
    examCorrectSpan = document.getElementById('exam-correct');
    examIncorrectSpan = document.getElementById('exam-incorrect');
    examProgress = document.getElementById('exam-progress');
    examExplanation = document.getElementById('exam-explanation');
    examQuestionContainer = document.getElementById('exam-question-container');

    // Modal
    resultModal = document.getElementById('result-modal');
    resultEmoji = document.getElementById('result-emoji');
    resultScoreDisplay = document.getElementById('result-score-display');
    resultDetail = document.getElementById('result-detail');
    resultMessage = document.getElementById('result-message');
    reviewWrongBtn = document.getElementById('review-wrong-btn');
    modalRestartBtn = document.getElementById('modal-restart-btn');
    backToStudyBtn = document.getElementById('back-to-study-btn');
}

function initExamEventListeners() {
    examChapterSelect?.addEventListener('change', () => {
        const value = examChapterSelect.value;
        // Extract chapter number from both formats: chuong_X.json and X.json
        const chapter = value === 'all' ? 'all' : (value.match(/chuong_(\d+)/)?.[1] || value.match(/\/(\d+)\.json$/)?.[1] || 'all');
        startExam(chapter);
    });


    shuffleAnswersToggle?.addEventListener('change', () => {
        shuffleAnswers = shuffleAnswersToggle.checked;
    });

    examRestartBtn?.addEventListener('click', restartExam);
    hintBtn?.addEventListener('click', showHint);
    examContinueBtn?.addEventListener('click', handleExamContinue);

    // Modal events
    resultModal?.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
    reviewWrongBtn?.addEventListener('click', () => {
        closeModal();
        startReviewWrong();
    });
    modalRestartBtn?.addEventListener('click', () => {
        closeModal();
        restartExam();
    });
    backToStudyBtn?.addEventListener('click', goBackToStudy);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// Practice mode - start with specific questions from topic
function startPracticeExam(questions) {
    examQuestions = [...questions];

    if (examQuestions.length === 0) {
        if (examQuestionText) examQuestionText.textContent = 'Không có câu hỏi để luyện tập.';
        if (examOptions) examOptions.innerHTML = '';
        return;
    }

    if (shuffleAnswers) {
        shuffleArray(examQuestions);
    }

    examIndex = 0;
    examAnswers = {};
    examScore = 0;
    wrongAnswers = [];
    waitingForContinue = false;

    renderExamQuestion();
    updateExamStats();
}

function startExam(chapter) {
    if (window.quizData.questions.length === 0) {
        setTimeout(() => startExam(chapter), 100);
        return;
    }

    examQuestions = [...getQuestionsByChapter(chapter)];

    if (examQuestions.length === 0) {
        if (examQuestionText) examQuestionText.textContent = 'Không tìm thấy câu hỏi. Vui lòng chọn chương khác.';
        if (examOptions) examOptions.innerHTML = '';
        return;
    }

    if (shuffleAnswers) {
        shuffleArray(examQuestions);
    }

    examIndex = 0;
    examAnswers = {};
    examScore = 0;
    wrongAnswers = [];
    waitingForContinue = false;

    renderExamQuestion();
    updateExamStats();
}

function renderExamQuestion() {
    if (examExplanation) {
        examExplanation.classList.add('hidden');
        examExplanation.innerHTML = '';
    }

    const q = examQuestions[examIndex];
    if (!q) return;

    hintUsed = false;
    hintBtn?.classList.remove('used');
    examContinueBtn?.classList.add('hidden');
    waitingForContinue = false;

    if (examQuestionNumber) examQuestionNumber.textContent = `Câu ${examIndex + 1}`;
    if (examQuestionText) examQuestionText.innerHTML = q.text;

    // Prepare options
    let options = [...q.options];
    let correctLetter = q.correct_answer;

    if (shuffleAnswers) {
        shuffleArray(options);
        const letters = ['A', 'B', 'C', 'D'];
        options = options.map((opt, i) => ({
            ...opt,
            originalLetter: opt.letter,
            letter: letters[i]
        }));
        correctLetter = options.find(o => o.originalLetter === q.correct_answer)?.letter || q.correct_answer;
    }

    q._shuffledOptions = options;
    q._shuffledCorrect = correctLetter;

    const answered = examAnswers[examIndex] !== undefined;

    if (examOptions) {
        examOptions.innerHTML = options.map(opt => {
            let classes = 'option';
            let icon = '';

            if (answered) {
                classes += ' disabled';
                const userAnswer = examAnswers[examIndex];
                if (opt.letter === correctLetter) {
                    classes += ' correct';
                    icon = '<span class="option-icon">✓</span>';
                } else if (opt.letter === userAnswer) {
                    classes += ' incorrect';
                    icon = '<span class="option-icon">✗</span>';
                }
            }

            return `
                <div class="${classes}" data-letter="${opt.letter}">
                    <span class="option-letter">${opt.letter}</span>
                    <span class="option-text">${opt.text}</span>
                    ${icon}
                </div>
            `;
        }).join('');

        if (!answered) {
            examOptions.querySelectorAll('.option').forEach(opt => {
                opt.addEventListener('click', () => selectExamAnswer(opt.dataset.letter));
            });
        }
    }

    updateExamProgress();
}

function updateExamProgress() {
    const total = examQuestions.length;
    const current = examIndex + 1;
    const progress = (current / total) * 100;

    if (examProgress) examProgress.style.width = `${progress}%`;
    if (examCurrentSpan) examCurrentSpan.textContent = current;
    if (examTotalSpan) examTotalSpan.textContent = total;
}

function updateExamStats() {
    let correct = 0, incorrect = 0;

    Object.keys(examAnswers).forEach(idx => {
        const q = examQuestions[idx];
        const userAnswer = examAnswers[idx];
        const correctAnswer = q._shuffledCorrect || q.correct_answer;
        if (userAnswer === correctAnswer) correct++;
        else incorrect++;
    });

    if (examCorrectSpan) examCorrectSpan.textContent = correct;
    if (examIncorrectSpan) examIncorrectSpan.textContent = incorrect;
    if (examScoreSpan) examScoreSpan.textContent = correct * 10;

    // Also update progress section stats
    const correctStat = document.getElementById('exam-correct-stat');
    const incorrectStat = document.getElementById('exam-incorrect-stat');
    if (correctStat) correctStat.textContent = correct;
    if (incorrectStat) incorrectStat.textContent = incorrect;
}

function selectExamAnswer(letter) {
    if (examAnswers[examIndex] !== undefined) return;

    const q = examQuestions[examIndex];
    const correctAnswer = q._shuffledCorrect || q.correct_answer;
    const isCorrect = letter === correctAnswer;

    examAnswers[examIndex] = letter;
    updateStats({ studiedToday: 1, totalAnswered: 1 });

    // Show explanation if incorrect AND AI toggle is checked
    const aiToggle = document.getElementById('ai-explanation-toggle');
    const showAI = aiToggle ? aiToggle.checked : true;

    if (!isCorrect && examExplanation && showAI) {
        const explanationText = q.explanation || "Không có giải thích chi tiết cho câu hỏi này.";
        examExplanation.innerHTML = `
            <div class="explanation-box">
                <div class="explanation-header">
                    <span class="gemini-badge">Gemini 3.0 PRO</span>
                </div>
                <div class="explanation-text">${explanationText}</div>
            </div>
        `;
        examExplanation.classList.remove('hidden');
    }

    if (isCorrect) {
        examScore += 10;
        updateStats({ totalCorrect: 1 });
    } else {
        wrongAnswers.push(q.question);
        examQuestionContainer?.classList.add('shake');
        setTimeout(() => {
            examQuestionContainer?.classList.remove('shake');
        }, 500);
    }

    // Mark options
    examOptions?.querySelectorAll('.option').forEach(opt => {
        opt.classList.add('disabled');
        if (opt.dataset.letter === correctAnswer) {
            opt.classList.add('correct');
            opt.innerHTML += '<span class="option-icon">✓</span>';
        } else if (opt.dataset.letter === letter && !isCorrect) {
            opt.classList.add('incorrect');
            opt.innerHTML += '<span class="option-icon">✗</span>';
        }
    });

    waitingForContinue = true;
    examContinueBtn?.classList.remove('hidden');
    updateExamStats();
}

function handleExamContinue() {
    if (!waitingForContinue) return;

    examIndex++;
    if (examIndex >= examQuestions.length) {
        showResultModal();
    } else {
        renderExamQuestion();
    }
}

function showHint() {
    if (hintUsed) return;
    hintUsed = true;
    hintBtn?.classList.add('used');

    const q = examQuestions[examIndex];
    const options = q._shuffledOptions || q.options;
    const correctOption = options.find(o => o.letter === (q._shuffledCorrect || q.correct_answer));

    if (!correctOption) return;

    const answerWords = correctOption.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    options.forEach(opt => {
        answerWords.forEach(word => {
            if (opt.text.toLowerCase().includes(word)) {
                const optEl = examOptions?.querySelector(`[data-letter="${opt.letter}"] .option-text`);
                if (optEl) {
                    const regex = new RegExp(`(${word})`, 'gi');
                    optEl.innerHTML = opt.text.replace(regex, '<span class="highlight">$1</span>');
                }
            }
        });
    });
}

function showResultModal() {
    const total = examQuestions.length;
    const correct = Object.values(examAnswers).filter((ans, i) => {
        const q = examQuestions[i];
        return ans === (q._shuffledCorrect || q.correct_answer);
    }).length;
    const percentage = Math.round((correct / total) * 100);

    let emoji = '😢';
    let message = 'Cần cố gắng hơn!';
    if (percentage >= 90) { emoji = '🏆'; message = 'Xuất sắc!'; }
    else if (percentage >= 70) { emoji = '🎉'; message = 'Tốt lắm!'; }
    else if (percentage >= 50) { emoji = '😊'; message = 'Khá tốt!'; }

    if (resultEmoji) resultEmoji.textContent = emoji;
    if (resultScoreDisplay) resultScoreDisplay.textContent = `${percentage}%`;
    if (resultDetail) resultDetail.textContent = `Đúng: ${correct} / ${total} câu`;
    if (resultMessage) resultMessage.textContent = message;

    // Show back to study button if in practice mode from study page
    if (backToStudyBtn) {
        const practiceSource = localStorage.getItem('practiceSource');
        if (isPracticeMode && practiceSource === 'study') {
            backToStudyBtn.classList.remove('hidden');
        } else {
            backToStudyBtn.classList.add('hidden');
        }
    }

    resultModal?.classList.add('active');
}

function closeModal() {
    resultModal?.classList.remove('active');
}

function goBackToStudy() {
    // Clear practice session data
    localStorage.removeItem('practiceQuestions');
    localStorage.removeItem('practiceTopicName');
    localStorage.removeItem('practiceSource');
    localStorage.removeItem('practiceTopicIdx');

    // Navigate back to study page
    window.location.href = 'study.html';
}

function restartExam() {
    closeModal();
    const chapter = examChapterSelect?.value || 'all';
    const chapterNum = chapter === 'all' ? 'all' : chapter.match(/chuong_(\d+)/)?.[1] || 'all';
    startExam(chapterNum);
}

function startReviewWrong() {
    if (wrongAnswers.length === 0) {
        alert('Không có câu sai để ôn tập!');
        return;
    }

    examQuestions = examQuestions.filter(q => wrongAnswers.includes(q.question));
    shuffleArray(examQuestions);
    examIndex = 0;
    examAnswers = {};
    examScore = 0;
    wrongAnswers = [];
    waitingForContinue = false;

    renderExamQuestion();
    updateExamStats();
}

function handleKeyboard(e) {
    if (resultModal?.classList.contains('active')) {
        if (e.key === 'Enter') restartExam();
        return;
    }

    const keyMap = {
        '1': 'A', '2': 'B', '3': 'C', '4': 'D',
        'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
        'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D'
    };

    if (keyMap[e.key] && !waitingForContinue) {
        e.preventDefault();
        selectExamAnswer(keyMap[e.key]);
    }

    if (e.key === 'Enter' && waitingForContinue) {
        e.preventDefault();
        handleExamContinue();
    }

    if ((e.key === 'h' || e.key === 'H') && !hintUsed) {
        e.preventDefault();
        showHint();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initExam);
