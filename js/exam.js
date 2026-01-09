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
        // Set value directly. If it's a chapter ID (unit-1), it will match the option values.
        examChapterSelect.value = chapter;
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
            option.value = ch.id; // Use Chapter ID (e.g. "unit-1")
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
    // Support string IDs
    const ch = currentSubjectData.chapters.find(c => c.id == chapter);
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
        // Check if value is 'all' or a valid file path, just pass it directly.
        // Old regex extraction was for legacy numbered files.
        // Now we use the full value from the option which is the file path.
        const chapter = value;
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

    // Clear previous shuffle data
    examQuestions.forEach(q => {
        delete q._shuffledOptions;
        delete q._shuffledCorrect;
        delete q._type;
    });

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

    // Clear previous shuffle data
    examQuestions.forEach(q => {
        delete q._shuffledOptions;
        delete q._shuffledCorrect;
        delete q._type;
    });

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

    // Check type
    const type = q.type || 'multiple_choice';
    q._type = type; // Store for valid checking

    // Render Question Text
    let questionHtml = q.text || q.question;
    // For fill in blank, we might need to modify the text if placeholders are distinct
    if (type === 'fill_blank' || type === 'rewrite') {
        // Automatically convert text like "______" or "..." into input fields if specifically marked??
        // Current JSON has "question" including placeholders.
    }

    if (examQuestionText) examQuestionText.innerHTML = questionHtml;

    const answered = examAnswers[examIndex] !== undefined;
    let optionsHtml = '';

    // RENDER: Multiple Choice & True/False
    if (type === 'multiple_choice' || type === 'true_false') {
        // Normalize options
        let options = (q.options || []).map(o => ({
            ...o,
            letter: o.letter || o.id,
            text: o.text || o.content
        }));

        let correctLetter = q.correct_answer;

        if (shuffleAnswers && type === 'multiple_choice') {
            if (!q._shuffledOptions) {
                let optsToShuffle = [...options];
                shuffleArray(optsToShuffle);
                const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, optsToShuffle.length);
                optsToShuffle = optsToShuffle.map((opt, i) => ({
                    ...opt,
                    originalLetter: opt.letter,
                    letter: letters[i]
                }));

                q._shuffledOptions = optsToShuffle;
                q._shuffledCorrect = optsToShuffle.find(o => o.originalLetter === q.correct_answer)?.letter || q.correct_answer;
            }
            options = q._shuffledOptions;
            correctLetter = q._shuffledCorrect;
        }

        optionsHtml = options.map(opt => {
            let classes = type === 'true_false' ? 'tf-btn' : 'option';
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
                } else if (type === 'true_false' && opt.letter === userAnswer) {
                    classes += ' selected'; // Just separate style if needed
                }
            }

            if (type === 'true_false') {
                return `
                    <div class="${classes}" onclick="selectExamAnswer('${opt.letter}')">
                        ${opt.text}
                    </div>
                `;
            }

            return `
                <div class="${classes}" data-letter="${opt.letter}" onclick="selectExamAnswer('${opt.letter}')">
                    <span class="option-letter">${opt.letter}</span>
                    <span class="option-text">${opt.text}</span>
                    ${icon}
                </div>
            `;
        }).join('');

        if (type === 'true_false') optionsHtml = `<div class="tf-container">${optionsHtml}</div>`;
    }
    // RENDER: Fill in Blank / Rewrite
    else if (type === 'fill_blank' || type === 'rewrite') {
        const userAnswer = examAnswers[examIndex] || '';
        const isCorrect = answered && userAnswer.trim().toLowerCase() === (q._shuffledCorrect || q.correct_answer).toLowerCase();
        const correctAns = q._shuffledCorrect || q.correct_answer; // Usually in metadata

        // Try to find the Answer from explanation or metadata if missing in dedicated field
        // For now assume q.correct_answer holds the text.

        let inputClass = 'fill-input';
        if (answered) {
            inputClass += isCorrect ? ' correct' : ' incorrect';
        }

        optionsHtml = `
            <div class="fill-blank-container">
                <input type="text" class="${inputClass}" 
                    value="${userAnswer}" 
                    placeholder="Type your answer..." 
                    ${answered ? 'disabled' : ''}
                    onkeydown="if(event.key==='Enter') selectExamAnswer(this.value)"
                />
                ${answered && !isCorrect ? `<div class="key-hint" style="margin-top:10px; color:var(--correct)">key: ${correctAns}</div>` : ''}
                ${!answered ? `<button class="continue-btn" style="margin-top:16px; width:auto; padding: 8px 24px;" onclick="selectExamAnswer(this.previousElementSibling.value || this.parentNode.querySelector('input').value)">Check</button>` : ''}
            </div>
         `;
        // Note: We injected a Check button for convenience
    }
    // RENDER: Inline Choice
    else if (type === 'inline_choice') {
        // Expect q.question to contain " / "
        // We might need to parse the question text DYNAMICALLY if it's not pre-parsed.
        // For now, let's treat it as a list of pills if options are provided.

        // If JSON options exist:
        let options = q.options || [];
        let correctLetter = q.correct_answer;

        // If generic options A/B/C/D representing the choices in text:
        // We display them as clickable pills.

        optionsHtml = `<div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-top:20px;">`;
        options.forEach(opt => {
            let classes = 'inline-choice-select';
            if (answered) {
                // classes += ' disabled'; // Prevent clicks handled by logic
                const userAnswer = examAnswers[examIndex];
                if (opt.letter === correctLetter) classes += ' correct';
                else if (opt.letter === userAnswer) classes += ' incorrect';
            }
            optionsHtml += `<div class="${classes}" onclick="selectExamAnswer('${opt.letter}')">${opt.text}</div>`;
        });
        optionsHtml += `</div>`;
    }

    if (examOptions) {
        examOptions.innerHTML = optionsHtml;
    }

    updateExamProgress();
}

function selectExamAnswer(answerInput) {
    if (examAnswers[examIndex] !== undefined) return;

    // Normalize input
    let userAnswer = answerInput;
    if (typeof userAnswer === 'string') userAnswer = userAnswer.trim();

    const q = examQuestions[examIndex];
    let isCorrect = false;
    let correctAnswer = q.correct_answer; // Default

    // Logic per type
    const type = q._type || 'multiple_choice';

    if (type === 'multiple_choice' || type === 'true_false' || type === 'inline_choice') {
        correctAnswer = q._shuffledCorrect || q.correct_answer;
        isCorrect = userAnswer === correctAnswer;
    }
    else if (type === 'fill_blank' || type === 'rewrite') {
        // Loose comparison
        // We need to fetch the REAL text answer. 
        // In generated JSON, correct_answer often holds "A". Wait.
        // Fill blank answers in generated JSON need to be checked.
        // Currently generated JSON has ` "correct_answer": "A" ` for EVERYTHING because parser defaulted to MC logic for 'final_q' if no items!
        // Or generic logic.

        // Assuming we fixed data or will fix data:
        // For now, let's use explanation key extraction as fallback if needed?
        // Or just strictly compare.

        // If the user hasn't typed anything, don't submit?
        if (!userAnswer) return;

        // Hack for current data state: If correct_answer is "A" and options[0] is the text...
        if (correctAnswer === "A" && q.options && q.options.length > 0) {
            correctAnswer = q.options[0].text;
        }

        // Remove punctuation for comparison
        const cleanUser = userAnswer.toLowerCase().replace(/[.,!?;]/g, '');
        const cleanKey = correctAnswer.toLowerCase().replace(/[.,!?;]/g, '');
        isCorrect = cleanUser === cleanKey;

        // Update q._shuffledCorrect for display use
        q._shuffledCorrect = correctAnswer;
    }

    examAnswers[examIndex] = userAnswer;
    updateStats({ studiedToday: 1, totalAnswered: 1 });

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

    // Re-render to show state
    renderExamQuestion();

    // Show explanation if incorrect AND AI toggle is checked
    const aiToggle = document.getElementById('ai-explanation-toggle');
    const showAI = aiToggle ? aiToggle.checked : true;

    if (!isCorrect && examExplanation && showAI) {
        const explanationText = q.explanation || q.explain || "Không có giải thích chi tiết cho câu hỏi này.";
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

    // Save Progress
    const subjectId = getCurrentSubjectId();
    const correctCount = Object.values(examAnswers).filter((ans, idx) => {
        const q = examQuestions[idx];
        return q && ans === q.correct;
    }).length;
    const totalCount = examQuestions.length;

    if (isPracticeMode) {
        const topicIdx = localStorage.getItem('practiceTopicIdx');
        const videoIdx = localStorage.getItem('practiceVideoIdx');

        if (topicIdx !== null) {
            // Save Topic Result (General)
            ProgressManager.saveTopicResult(subjectId, topicIdx, correctCount, totalCount);

            // Save Video Result (Specific)
            if (videoIdx !== null) {
                ProgressManager.saveVideoResult(subjectId, topicIdx, videoIdx, correctCount, totalCount);
            }
        }
    } else {
        const chapter = examChapterSelect?.value;
        if (chapter && chapter !== 'all') {
            ProgressManager.saveChapterResult(subjectId, chapter, correctCount, totalCount);
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
    localStorage.removeItem('practiceVideoIdx');

    // Navigate back to study page
    window.location.href = 'study.html';
}

function restartExam() {
    closeModal();
    const chapter = examChapterSelect?.value || 'all';
    // Use raw value (file path or 'all')
    startExam(chapter);
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
        '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E',
        'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E',
        'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E'
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


function updateExamStats() {
    if (examQuestions.length === 0) return;

    if (examCurrentSpan) examCurrentSpan.textContent = examIndex + 1;
    if (examTotalSpan) examTotalSpan.textContent = examQuestions.length;

    let correct = 0;
    let incorrect = 0;

    Object.keys(examAnswers).forEach(idx => {
        const q = examQuestions[idx];
        const ans = examAnswers[idx];
        const correctAns = q._shuffledCorrect || q.correct_answer;
        if (ans === correctAns) {
            correct++;
        } else {
            incorrect++;
        }
    });

    if (examCorrectSpan) examCorrectSpan.textContent = correct;
    if (examIncorrectSpan) examIncorrectSpan.textContent = incorrect;
    if (examScoreSpan) examScoreSpan.textContent = examScore;
}

function updateExamProgress() {
    if (examProgress && examQuestions.length > 0) {
        const percent = ((examIndex + 1) / examQuestions.length) * 100;
        examProgress.style.width = `${percent}%`;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initExam);
