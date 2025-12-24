// ===== Quiz App =====
class QuizApp {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.answers = {};
        this.shuffled = false;

        this.initElements();
        this.initEventListeners();
        this.loadQuiz('exam/chuong_1.json');
    }

    initElements() {
        this.quizSelect = document.getElementById('quiz-select');
        this.shuffleToggle = document.getElementById('shuffle-toggle');
        this.questionText = document.getElementById('question-text');
        this.optionsContainer = document.getElementById('options');
        this.currentQuestionSpan = document.getElementById('current-question');
        this.totalQuestionsSpan = document.getElementById('total-questions');
        this.progressFill = document.getElementById('progress-fill');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.correctCount = document.getElementById('correct-count');
        this.incorrectCount = document.getElementById('incorrect-count');
        this.pendingCount = document.getElementById('pending-count');
        this.restartBtn = document.getElementById('restart-btn');
        this.resultModal = document.getElementById('result-modal');
        this.resultScore = document.getElementById('result-score');
        this.resultDetail = document.getElementById('result-detail');
        this.modalRestart = document.getElementById('modal-restart');
    }

    initEventListeners() {
        this.quizSelect.addEventListener('change', () => {
            this.loadQuiz(this.quizSelect.value);
        });

        this.shuffleToggle.addEventListener('change', () => {
            this.shuffled = this.shuffleToggle.checked;
            this.loadQuiz(this.quizSelect.value);
        });

        this.prevBtn.addEventListener('click', () => this.navigate(-1));
        this.nextBtn.addEventListener('click', () => this.navigate(1));
        this.restartBtn.addEventListener('click', () => this.restart());
        this.modalRestart.addEventListener('click', () => this.restart());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.navigate(-1);
            if (e.key === 'ArrowRight') this.navigate(1);
            if (e.key >= '1' && e.key <= '4') {
                const index = parseInt(e.key) - 1;
                if (index < this.questions[this.currentIndex]?.options?.length) {
                    this.selectOption(index);
                }
            }
        });
    }

    async loadQuiz(filename) {
        try {
            this.questionText.textContent = 'Đang tải câu hỏi...';
            this.optionsContainer.innerHTML = '';

            const response = await fetch(filename);
            if (!response.ok) throw new Error('Failed to load quiz');

            const data = await response.json();
            this.questions = [...data.questions];

            if (this.shuffled) {
                this.shuffleArray(this.questions);
            }

            this.currentIndex = 0;
            this.answers = {};
            this.updateStats();
            this.renderQuestion();

        } catch (error) {
            console.error('Error loading quiz:', error);
            this.questionText.textContent = 'Lỗi tải dữ liệu. Vui lòng thử lại.';
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    renderQuestion() {
        const question = this.questions[this.currentIndex];
        if (!question) return;

        // Update question text
        this.questionText.textContent = question.text;

        // Update progress
        this.currentQuestionSpan.textContent = `Câu ${this.currentIndex + 1}`;
        this.totalQuestionsSpan.textContent = `/ ${this.questions.length}`;
        const progress = ((this.currentIndex + 1) / this.questions.length) * 100;
        this.progressFill.style.width = `${progress}%`;

        // Update navigation
        this.prevBtn.disabled = this.currentIndex === 0;

        if (this.currentIndex === this.questions.length - 1) {
            this.nextBtn.textContent = 'Hoàn thành ✓';
        } else {
            this.nextBtn.textContent = 'Tiếp theo →';
        }

        // Render options
        this.optionsContainer.innerHTML = '';
        const answered = this.answers[this.currentIndex] !== undefined;

        question.options.forEach((option, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option';

            if (answered) {
                optionEl.classList.add('disabled');
                const userAnswer = this.answers[this.currentIndex];
                const correctAnswer = question.correct_answer.toUpperCase();

                if (option.letter === correctAnswer) {
                    optionEl.classList.add('correct');
                } else if (option.letter === userAnswer) {
                    optionEl.classList.add('incorrect');
                }
            }

            let icon = '';
            if (answered) {
                const correctAnswer = question.correct_answer.toUpperCase();
                if (option.letter === correctAnswer) {
                    icon = '<span class="option-icon">✓</span>';
                } else if (option.letter === this.answers[this.currentIndex]) {
                    icon = '<span class="option-icon">✗</span>';
                }
            }

            optionEl.innerHTML = `
                <span class="option-letter">${option.letter}</span>
                <span class="option-text">${option.text}</span>
                ${icon}
            `;

            if (!answered) {
                optionEl.addEventListener('click', () => this.selectOption(index));
            }

            this.optionsContainer.appendChild(optionEl);
        });
    }

    selectOption(index) {
        const question = this.questions[this.currentIndex];
        if (!question || this.answers[this.currentIndex] !== undefined) return;

        const selectedLetter = question.options[index].letter;
        this.answers[this.currentIndex] = selectedLetter;

        this.renderQuestion();
        this.updateStats();
    }

    updateStats() {
        let correct = 0;
        let incorrect = 0;

        Object.keys(this.answers).forEach(index => {
            const question = this.questions[index];
            const userAnswer = this.answers[index];
            const correctAnswer = question.correct_answer.toUpperCase();

            if (userAnswer === correctAnswer) {
                correct++;
            } else {
                incorrect++;
            }
        });

        const pending = this.questions.length - correct - incorrect;

        this.correctCount.textContent = correct;
        this.incorrectCount.textContent = incorrect;
        this.pendingCount.textContent = pending;
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;

        if (newIndex >= 0 && newIndex < this.questions.length) {
            this.currentIndex = newIndex;
            this.renderQuestion();
        } else if (newIndex >= this.questions.length) {
            // Show results
            this.showResults();
        }
    }

    showResults() {
        const total = this.questions.length;
        let correct = 0;

        Object.keys(this.answers).forEach(index => {
            const question = this.questions[index];
            const userAnswer = this.answers[index];
            const correctAnswer = question.correct_answer.toUpperCase();

            if (userAnswer === correctAnswer) {
                correct++;
            }
        });

        const percentage = Math.round((correct / total) * 100);
        this.resultScore.textContent = `${percentage}%`;
        this.resultDetail.textContent = `Đúng: ${correct} / ${total} câu`;
        this.resultModal.classList.add('active');
    }

    restart() {
        this.resultModal.classList.remove('active');
        this.loadQuiz(this.quizSelect.value);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
