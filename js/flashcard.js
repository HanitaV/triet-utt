// ===== Flashcard Page =====

let flashcardQuestions = [];
let flashcardIndex = 0;
let rememberedCards = new Set();

// DOM Elements
let flashcardChapterSelect, flashcard, flashcardQuestion, flashcardAnswerLetter;
let flashcardAnswer, flashcardProgress, flashcardCurrent, flashcardTotal;
let forgotBtn, rememberedBtn, shuffleFlashcardsBtn;

async function initFlashcard() {
    await loadAllData();
    initFlashcardElements();
    initFlashcardEventListeners();
    loadFlashcards();
}

function initFlashcardElements() {
    flashcardChapterSelect = document.getElementById('flashcard-chapter-select');
    flashcard = document.getElementById('flashcard');
    flashcardQuestion = document.getElementById('flashcard-question');
    flashcardAnswerLetter = document.getElementById('flashcard-answer-letter');
    flashcardAnswer = document.getElementById('flashcard-answer');
    flashcardProgress = document.getElementById('flashcard-progress');
    flashcardCurrent = document.getElementById('flashcard-current');
    flashcardTotal = document.getElementById('flashcard-total');
    forgotBtn = document.getElementById('forgot-btn');
    rememberedBtn = document.getElementById('remembered-btn');
    shuffleFlashcardsBtn = document.getElementById('shuffle-flashcards');
}

function initFlashcardEventListeners() {
    flashcard?.addEventListener('click', flipFlashcard);
    forgotBtn?.addEventListener('click', handleFlashcardForgot);
    rememberedBtn?.addEventListener('click', handleFlashcardRemembered);
    shuffleFlashcardsBtn?.addEventListener('click', shuffleFlashcardDeck);
    flashcardChapterSelect?.addEventListener('change', loadFlashcards);
}

function loadFlashcards() {
    const chapter = flashcardChapterSelect?.value || 'all';
    flashcardQuestions = [...getQuestionsByChapter(chapter)];
    shuffleArray(flashcardQuestions);
    flashcardIndex = 0;
    rememberedCards = new Set();
    flashcard?.classList.remove('flipped');
    renderFlashcard();
}

function shuffleFlashcardDeck() {
    shuffleArray(flashcardQuestions);
    flashcardIndex = 0;
    flashcard?.classList.remove('flipped');
    renderFlashcard();
}

function renderFlashcard() {
    const remaining = flashcardQuestions.filter((_, i) => !rememberedCards.has(i));

    if (remaining.length === 0) {
        if (flashcardQuestion) flashcardQuestion.textContent = '🎉 Chúc mừng! Bạn đã hoàn thành tất cả thẻ!';
        if (flashcardAnswerLetter) flashcardAnswerLetter.textContent = '✓';
        if (flashcardAnswer) flashcardAnswer.textContent = 'Nhấn "Trộn" để bắt đầu lại';
        updateFlashcardProgress();
        return;
    }

    // Find next non-remembered card
    while (rememberedCards.has(flashcardIndex)) {
        flashcardIndex = (flashcardIndex + 1) % flashcardQuestions.length;
    }

    const q = flashcardQuestions[flashcardIndex];
    const correctOption = q.options.find(o => o.letter === q.correct_answer);

    if (flashcardQuestion) flashcardQuestion.textContent = q.text;
    if (flashcardAnswerLetter) flashcardAnswerLetter.textContent = q.correct_answer;
    if (flashcardAnswer) flashcardAnswer.textContent = correctOption?.text || '';

    updateFlashcardProgress();
}

function updateFlashcardProgress() {
    const total = flashcardQuestions.length;
    const remembered = rememberedCards.size;
    const remaining = total - remembered;

    if (flashcardTotal) flashcardTotal.textContent = total;
    if (flashcardCurrent) flashcardCurrent.textContent = remaining;

    const progress = total > 0 ? ((remembered / total) * 100) : 0;
    if (flashcardProgress) flashcardProgress.style.width = `${progress}%`;
}

function flipFlashcard() {
    flashcard?.classList.toggle('flipped');
}

function handleFlashcardForgot() {
    flashcard?.classList.remove('flipped');
    flashcardIndex = (flashcardIndex + 1) % flashcardQuestions.length;
    renderFlashcard();
}

function handleFlashcardRemembered() {
    rememberedCards.add(flashcardIndex);
    updateStats({ studiedToday: 1 });

    flashcard?.classList.remove('flipped');
    flashcardIndex = (flashcardIndex + 1) % flashcardQuestions.length;
    renderFlashcard();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initFlashcard);
