// ===== All-in-One Quiz App =====
class QuizApp {
    constructor() {
        this.allData = { chapters: [], questions: [] };
        this.currentTab = 'dashboard';

        // Flashcard state
        this.flashcardQuestions = [];
        this.flashcardIndex = 0;
        this.rememberedCards = new Set();

        // Exam state
        this.examQuestions = [];
        this.examIndex = 0;
        this.examAnswers = {};
        this.examScore = 0;
        this.wrongAnswers = [];
        this.waitingForContinue = false;
        this.shuffleAnswers = true;
        this.hintUsed = false;

        // Stats
        this.studiedToday = parseInt(localStorage.getItem('studiedToday') || '0');
        this.totalCorrect = parseInt(localStorage.getItem('totalCorrect') || '0');
        this.totalAnswered = parseInt(localStorage.getItem('totalAnswered') || '0');

        this.init();
    }

    async init() {
        this.initTheme();
        this.initElements();
        this.initEventListeners();
        await this.loadAllData();
        this.updateDashboard();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('quiz-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('.theme-icon');
        if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    initElements() {
        // Navigation
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.themeToggle = document.getElementById('theme-toggle');

        // Dashboard
        this.chapterCards = document.querySelectorAll('.chapter-card');
        this.startAllBtn = document.getElementById('start-all-btn');

        // Study
        this.studyChapterSelect = document.getElementById('study-chapter-select');
        this.studyTabs = document.querySelectorAll('.study-tab');
        this.studyViews = document.querySelectorAll('.study-view');

        // Flashcard
        this.flashcardChapterSelect = document.getElementById('flashcard-chapter-select');
        this.flashcard = document.getElementById('flashcard');
        this.flashcardQuestion = document.getElementById('flashcard-question');
        this.flashcardAnswerLetter = document.getElementById('flashcard-answer-letter');
        this.flashcardAnswer = document.getElementById('flashcard-answer');
        this.flashcardProgress = document.getElementById('flashcard-progress');
        this.flashcardCurrent = document.getElementById('flashcard-current');
        this.flashcardTotal = document.getElementById('flashcard-total');
        this.forgotBtn = document.getElementById('forgot-btn');
        this.rememberedBtn = document.getElementById('remembered-btn');
        this.shuffleFlashcardsBtn = document.getElementById('shuffle-flashcards');

        // Exam
        this.examChapterSelect = document.getElementById('exam-chapter-select');
        this.examQuestionContainer = document.getElementById('exam-question-container');
        this.examQuestionNumber = document.getElementById('exam-question-number');
        this.examQuestionText = document.getElementById('exam-question-text');
        this.examOptions = document.getElementById('exam-options');
        this.examContinueBtn = document.getElementById('exam-continue-btn');
        this.examProgress = document.getElementById('exam-progress');
        this.examCurrentSpan = document.getElementById('exam-current');
        this.examTotalSpan = document.getElementById('exam-total');
        this.examCorrectSpan = document.getElementById('exam-correct');
        this.examIncorrectSpan = document.getElementById('exam-incorrect');
        this.examScoreSpan = document.getElementById('exam-score');
        this.hintBtn = document.getElementById('hint-btn');
        this.shuffleAnswersToggle = document.getElementById('shuffle-answers-toggle');
        this.examRestartBtn = document.getElementById('exam-restart-btn');

        // Modal
        this.resultModal = document.getElementById('result-modal');
        this.resultEmoji = document.getElementById('result-emoji');
        this.resultScoreDisplay = document.getElementById('result-score-display');
        this.resultDetail = document.getElementById('result-detail');
        this.resultMessage = document.getElementById('result-message');
        this.reviewWrongBtn = document.getElementById('review-wrong-btn');
        this.modalRestartBtn = document.getElementById('modal-restart-btn');
    }

    initEventListeners() {
        // Theme toggle
        this.themeToggle?.addEventListener('click', () => this.toggleTheme());

        // Navigation
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Dashboard
        this.chapterCards.forEach(card => {
            card.addEventListener('click', () => {
                const chapter = card.dataset.chapter;
                this.startExam(chapter);
            });
        });

        this.startAllBtn?.addEventListener('click', () => this.startExam('all'));

        // Study tabs
        this.studyTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchStudyTab(tab.dataset.study));
        });

        this.studyChapterSelect?.addEventListener('change', () => this.loadStudyContent());

        // Flashcard
        this.flashcard?.addEventListener('click', () => this.flipFlashcard());
        this.forgotBtn?.addEventListener('click', () => this.handleFlashcardForgot());
        this.rememberedBtn?.addEventListener('click', () => this.handleFlashcardRemembered());
        this.shuffleFlashcardsBtn?.addEventListener('click', () => this.shuffleFlashcardDeck());
        this.flashcardChapterSelect?.addEventListener('change', () => this.loadFlashcards());

        // Exam
        this.examChapterSelect?.addEventListener('change', () => {
            this.startExam(this.examChapterSelect.value);
        });
        this.shuffleAnswersToggle?.addEventListener('change', () => {
            this.shuffleAnswers = this.shuffleAnswersToggle.checked;
        });
        this.hintBtn?.addEventListener('click', () => this.showHint());
        this.examContinueBtn?.addEventListener('click', () => this.handleExamContinue());
        this.examRestartBtn?.addEventListener('click', () => this.restartExam());

        // Modal
        this.resultModal?.querySelector('.modal-overlay')?.addEventListener('click', () => {
            this.resultModal.classList.remove('active');
        });
        this.reviewWrongBtn?.addEventListener('click', () => this.startReviewWrong());
        this.modalRestartBtn?.addEventListener('click', () => this.restartExam());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('quiz-theme', next);
        this.updateThemeIcon(next);
    }

    async loadAllData() {
        const files = ['exam/chuong_1.json', 'exam/chuong_2.json', 'exam/chuong_3.json'];

        for (const file of files) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    const data = await response.json();
                    this.allData.chapters.push({
                        file,
                        chapter: data.chapter,
                        questions: data.questions
                    });
                    this.allData.questions.push(...data.questions.map(q => ({
                        ...q,
                        chapter: data.chapter,
                        file
                    })));
                }
            } catch (e) {
                console.error(`Error loading ${file}:`, e);
            }
        }
    }

    updateDashboard() {
        // Update chapter counts
        const counts = { 1: 0, 2: 0, 3: 0 };
        this.allData.chapters.forEach((ch, i) => {
            counts[i + 1] = ch.questions.length;
        });

        document.getElementById('ch1-count').textContent = `${counts[1]} câu`;
        document.getElementById('ch2-count').textContent = `${counts[2]} câu`;
        document.getElementById('ch3-count').textContent = `${counts[3]} câu`;
        document.getElementById('total-questions').textContent = this.allData.questions.length;
        document.getElementById('studied-today').textContent = this.studiedToday;

        const accuracy = this.totalAnswered > 0
            ? Math.round((this.totalCorrect / this.totalAnswered) * 100)
            : 0;
        document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        this.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Initialize tab content
        if (tabName === 'study') {
            this.loadStudyContent();
        } else if (tabName === 'flashcard') {
            this.loadFlashcards();
        } else if (tabName === 'exam') {
            // Only start if no exam is running
            if (this.examQuestions.length === 0) {
                const selectedChapter = this.examChapterSelect?.value || 'all';
                this.startExam(selectedChapter);
            }
        }
    }

    // ===== SMART STUDY =====
    switchStudyTab(viewName) {
        this.studyTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.study === viewName);
        });

        this.studyViews.forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });

        this.loadStudyContent();
    }

    loadStudyContent() {
        const activeView = document.querySelector('.study-view.active');
        if (!activeView) return;

        const viewId = activeView.id;
        const chapter = this.studyChapterSelect?.value || 'all';
        const questions = this.getQuestionsByChapter(chapter);

        if (viewId === 'timeline-view') {
            this.generateTimeline(questions);
        } else if (viewId === 'compare-view') {
            this.generateComparisons(questions);
        } else if (viewId === 'keywords-view') {
            this.generateKeywords(questions);
        }
    }

    getQuestionsByChapter(chapter) {
        if (chapter === 'all') {
            return this.allData.questions;
        }
        const ch = this.allData.chapters.find(c => c.file === chapter);
        return ch ? ch.questions : [];
    }

    generateTimeline(questions) {
        const container = document.getElementById('timeline-container');
        const timePatterns = [
            /thế kỷ\s*(\w+)/gi,
            /năm\s*(\d{4})/gi,
            /thập niên\s*(\d+)/gi,
            /thời kỳ\s*([^,\.]+)/gi,
            /giai đoạn\s*([^,\.]+)/gi,
            /cuối thế kỷ\s*(\w+)/gi,
            /đầu thế kỷ\s*(\w+)/gi,
            /giữa thế kỷ\s*(\w+)/gi
        ];

        const timelineItems = [];

        questions.forEach(q => {
            const fullText = q.text + ' ' + q.options.map(o => o.text).join(' ');

            timePatterns.forEach(pattern => {
                let match;
                const regex = new RegExp(pattern.source, pattern.flags);
                while ((match = regex.exec(fullText)) !== null) {
                    timelineItems.push({
                        date: match[0],
                        text: q.text.substring(0, 150) + (q.text.length > 150 ? '...' : ''),
                        questionNum: q.question
                    });
                }
            });
        });

        // Remove duplicates
        const uniqueItems = timelineItems.filter((item, index, self) =>
            index === self.findIndex(t => t.date === item.date && t.questionNum === item.questionNum)
        );

        if (uniqueItems.length === 0) {
            container.innerHTML = '<p class="loading-text">Không tìm thấy mốc thời gian trong dữ liệu.</p>';
            return;
        }

        container.innerHTML = uniqueItems.slice(0, 20).map(item => `
            <div class="timeline-item">
                <span class="timeline-date">${item.date}</span>
                <p class="timeline-text">${item.text}</p>
            </div>
        `).join('');
    }

    generateComparisons(questions) {
        const container = document.getElementById('compare-container');
        const comparePairs = [
            { left: 'duy vật', right: 'duy tâm', title: 'Duy vật vs Duy tâm' },
            { left: 'biện chứng', right: 'siêu hình', title: 'Biện chứng vs Siêu hình' },
            { left: 'vật chất', right: 'ý thức', title: 'Vật chất vs Ý thức' },
            { left: 'lực lượng sản xuất', right: 'quan hệ sản xuất', title: 'LLSX vs QHSX' },
            { left: 'cơ sở hạ tầng', right: 'kiến trúc thượng tầng', title: 'CSHT vs KTTT' },
            { left: 'chất', right: 'lượng', title: 'Chất vs Lượng' }
        ];

        const tables = [];

        comparePairs.forEach(pair => {
            const leftQuestions = questions.filter(q =>
                q.text.toLowerCase().includes(pair.left) ||
                q.options.some(o => o.text.toLowerCase().includes(pair.left))
            );
            const rightQuestions = questions.filter(q =>
                q.text.toLowerCase().includes(pair.right) ||
                q.options.some(o => o.text.toLowerCase().includes(pair.right))
            );

            if (leftQuestions.length > 0 || rightQuestions.length > 0) {
                const rows = [];
                const maxRows = Math.min(3, Math.max(leftQuestions.length, rightQuestions.length));

                for (let i = 0; i < maxRows; i++) {
                    const leftQ = leftQuestions[i];
                    const rightQ = rightQuestions[i];

                    const leftAnswer = leftQ ? leftQ.options.find(o => o.letter === leftQ.correct_answer)?.text : '';
                    const rightAnswer = rightQ ? rightQ.options.find(o => o.letter === rightQ.correct_answer)?.text : '';

                    rows.push({ left: leftAnswer || '-', right: rightAnswer || '-' });
                }

                if (rows.length > 0) {
                    tables.push({ title: pair.title, rows, leftLabel: pair.left, rightLabel: pair.right });
                }
            }
        });

        if (tables.length === 0) {
            container.innerHTML = '<p class="loading-text">Không tìm thấy cặp khái niệm đối lập.</p>';
            return;
        }

        container.innerHTML = tables.map(table => `
            <div class="compare-table">
                <div class="compare-header">
                    <span>${table.leftLabel.toUpperCase()}</span>
                    <span>${table.rightLabel.toUpperCase()}</span>
                </div>
                ${table.rows.map(row => `
                    <div class="compare-row">
                        <div class="compare-cell">${row.left}</div>
                        <div class="compare-cell">${row.right}</div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    generateKeywords(questions) {
        const container = document.getElementById('keywords-container');
        const keywordPatterns = [
            'vật chất', 'ý thức', 'biện chứng', 'siêu hình', 'duy vật', 'duy tâm',
            'mâu thuẫn', 'thống nhất', 'đấu tranh', 'phủ định', 'chất', 'lượng',
            'nguyên nhân', 'kết quả', 'tất nhiên', 'ngẫu nhiên', 'nội dung', 'hình thức',
            'bản chất', 'hiện tượng', 'khả năng', 'hiện thực', 'cái chung', 'cái riêng',
            'thực tiễn', 'nhận thức', 'chân lý', 'sai lầm', 'tuyệt đối', 'tương đối',
            'lực lượng sản xuất', 'quan hệ sản xuất', 'phương thức sản xuất',
            'cơ sở hạ tầng', 'kiến trúc thượng tầng', 'hình thái kinh tế-xã hội',
            'giai cấp', 'đấu tranh giai cấp', 'nhà nước', 'cách mạng xã hội'
        ];

        const keywordCounts = {};
        const allText = questions.map(q => q.text + ' ' + q.options.map(o => o.text).join(' ')).join(' ').toLowerCase();

        keywordPatterns.forEach(kw => {
            const regex = new RegExp(kw, 'gi');
            const matches = allText.match(regex);
            if (matches) {
                keywordCounts[kw] = matches.length;
            }
        });

        const sortedKeywords = Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30);

        if (sortedKeywords.length === 0) {
            container.innerHTML = '<p class="loading-text">Không tìm thấy từ khóa.</p>';
            return;
        }

        const maxCount = sortedKeywords[0][1];

        container.innerHTML = `
            <div class="keywords-cloud">
                ${sortedKeywords.map(([kw, count]) => {
            const size = count / maxCount > 0.5 ? 'large' : '';
            return `<span class="keyword-tag ${size}" data-count="${count}">${kw} (${count})</span>`;
        }).join('')}
            </div>
        `;
    }

    // ===== FLASHCARD =====
    loadFlashcards() {
        const chapter = this.flashcardChapterSelect?.value || 'all';
        this.flashcardQuestions = [...this.getQuestionsByChapter(chapter)];
        this.shuffleArray(this.flashcardQuestions);
        this.flashcardIndex = 0;
        this.rememberedCards = new Set();
        this.flashcard?.classList.remove('flipped');
        this.renderFlashcard();
    }

    shuffleFlashcardDeck() {
        this.shuffleArray(this.flashcardQuestions);
        this.flashcardIndex = 0;
        this.flashcard?.classList.remove('flipped');
        this.renderFlashcard();
    }

    renderFlashcard() {
        const remaining = this.flashcardQuestions.filter((_, i) => !this.rememberedCards.has(i));

        if (remaining.length === 0) {
            this.flashcardQuestion.textContent = '🎉 Chúc mừng! Bạn đã hoàn thành tất cả thẻ!';
            this.flashcardAnswerLetter.textContent = '✓';
            this.flashcardAnswer.textContent = 'Nhấn "Trộn" để bắt đầu lại';
            this.updateFlashcardProgress();
            return;
        }

        // Find next non-remembered card
        while (this.rememberedCards.has(this.flashcardIndex)) {
            this.flashcardIndex = (this.flashcardIndex + 1) % this.flashcardQuestions.length;
        }

        const q = this.flashcardQuestions[this.flashcardIndex];
        const correctOption = q.options.find(o => o.letter === q.correct_answer);

        this.flashcardQuestion.textContent = q.text;
        this.flashcardAnswerLetter.textContent = q.correct_answer;
        this.flashcardAnswer.textContent = correctOption?.text || '';

        this.updateFlashcardProgress();
    }

    updateFlashcardProgress() {
        const total = this.flashcardQuestions.length;
        const remembered = this.rememberedCards.size;
        const remaining = total - remembered;

        this.flashcardTotal.textContent = total;
        this.flashcardCurrent.textContent = remaining;

        const progress = total > 0 ? ((remembered / total) * 100) : 0;
        this.flashcardProgress.style.width = `${progress}%`;
    }

    flipFlashcard() {
        this.flashcard?.classList.toggle('flipped');
    }

    handleFlashcardForgot() {
        // Move to end of deck (it will come back)
        this.flashcard?.classList.remove('flipped');
        this.flashcardIndex = (this.flashcardIndex + 1) % this.flashcardQuestions.length;
        this.renderFlashcard();
    }

    handleFlashcardRemembered() {
        this.rememberedCards.add(this.flashcardIndex);
        this.studiedToday++;
        localStorage.setItem('studiedToday', this.studiedToday);

        this.flashcard?.classList.remove('flipped');
        this.flashcardIndex = (this.flashcardIndex + 1) % this.flashcardQuestions.length;
        this.renderFlashcard();
        this.updateDashboard();
    }

    // ===== EXAM MODE =====
    startExam(chapter) {
        // Check if data is loaded
        if (this.allData.questions.length === 0) {
            console.log('Data not loaded yet, waiting...');
            setTimeout(() => this.startExam(chapter), 100);
            return;
        }

        // Switch to exam tab WITHOUT re-triggering startExam
        this.currentTab = 'exam';
        this.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === 'exam');
        });
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === 'exam-tab');
        });

        // Update the select dropdown
        if (this.examChapterSelect) {
            this.examChapterSelect.value = chapter;
        }

        // Get and shuffle questions
        this.examQuestions = [...this.getQuestionsByChapter(chapter)];

        if (this.examQuestions.length === 0) {
            this.examQuestionText.textContent = 'Không tìm thấy câu hỏi. Vui lòng chọn chương khác.';
            this.examOptions.innerHTML = '';
            return;
        }

        this.shuffleArray(this.examQuestions);
        this.examIndex = 0;
        this.examAnswers = {};
        this.examScore = 0;
        this.wrongAnswers = [];
        this.waitingForContinue = false;

        this.renderExamQuestion();
        this.updateExamStats();
    }

    renderExamQuestion() {
        const q = this.examQuestions[this.examIndex];
        if (!q) return;

        this.hintUsed = false;
        this.hintBtn?.classList.remove('used');
        this.examContinueBtn?.classList.add('hidden');
        this.waitingForContinue = false;

        this.examQuestionNumber.textContent = `Câu ${this.examIndex + 1}`;
        this.examQuestionText.innerHTML = q.text;

        // Prepare options (with optional shuffling)
        let options = [...q.options];
        let correctLetter = q.correct_answer;

        if (this.shuffleAnswers) {
            const correctOption = options.find(o => o.letter === q.correct_answer);
            this.shuffleArray(options);
            // Reassign letters
            const letters = ['A', 'B', 'C', 'D'];
            options = options.map((opt, i) => ({
                ...opt,
                originalLetter: opt.letter,
                letter: letters[i]
            }));
            // Find new correct letter
            correctLetter = options.find(o => o.originalLetter === q.correct_answer)?.letter || q.correct_answer;
        }

        // Store for checking
        q._shuffledOptions = options;
        q._shuffledCorrect = correctLetter;

        const answered = this.examAnswers[this.examIndex] !== undefined;

        this.examOptions.innerHTML = options.map((opt, i) => {
            let classes = 'option';
            let icon = '';

            if (answered) {
                classes += ' disabled';
                const userAnswer = this.examAnswers[this.examIndex];
                if (opt.letter === correctLetter) {
                    classes += ' correct';
                    icon = '<span class="option-icon">✓</span>';
                } else if (opt.letter === userAnswer) {
                    classes += ' incorrect';
                    icon = '<span class="option-icon">✗</span>';
                }
            }

            return `
                <div class="${classes}" data-letter="${opt.letter}" data-index="${i}">
                    <span class="option-letter">${opt.letter}</span>
                    <span class="option-text">${opt.text}</span>
                    ${icon}
                </div>
            `;
        }).join('');

        // Add click handlers
        if (!answered) {
            this.examOptions.querySelectorAll('.option').forEach(opt => {
                opt.addEventListener('click', () => this.selectExamAnswer(opt.dataset.letter));
            });
        }

        this.updateExamProgress();
    }

    updateExamProgress() {
        const total = this.examQuestions.length;
        const current = this.examIndex + 1;
        const progress = (current / total) * 100;

        this.examProgress.style.width = `${progress}%`;
        this.examCurrentSpan.textContent = current;
        this.examTotalSpan.textContent = total;
    }

    updateExamStats() {
        let correct = 0, incorrect = 0;

        Object.keys(this.examAnswers).forEach(idx => {
            const q = this.examQuestions[idx];
            const userAnswer = this.examAnswers[idx];
            const correctAnswer = q._shuffledCorrect || q.correct_answer;

            if (userAnswer === correctAnswer) correct++;
            else incorrect++;
        });

        this.examCorrectSpan.textContent = correct;
        this.examIncorrectSpan.textContent = incorrect;
        this.examScoreSpan.textContent = correct * 10;
    }

    selectExamAnswer(letter) {
        if (this.examAnswers[this.examIndex] !== undefined) return;

        const q = this.examQuestions[this.examIndex];
        const correctAnswer = q._shuffledCorrect || q.correct_answer;
        const isCorrect = letter === correctAnswer;

        this.examAnswers[this.examIndex] = letter;
        this.studiedToday++;
        this.totalAnswered++;
        localStorage.setItem('studiedToday', this.studiedToday);
        localStorage.setItem('totalAnswered', this.totalAnswered);

        if (isCorrect) {
            this.examScore += 10;
            this.totalCorrect++;
            localStorage.setItem('totalCorrect', this.totalCorrect);

            // Mark options
            this.examOptions.querySelectorAll('.option').forEach(opt => {
                opt.classList.add('disabled');
                if (opt.dataset.letter === correctAnswer) {
                    opt.classList.add('correct');
                    opt.innerHTML += '<span class="option-icon">✓</span>';
                }
            });

            // Auto advance
            setTimeout(() => this.advanceExam(), 800);
        } else {
            // Track wrong answer
            this.wrongAnswers.push(q.question);

            // Shake animation
            this.examQuestionContainer?.classList.add('shake');
            setTimeout(() => {
                this.examQuestionContainer?.classList.remove('shake');
            }, 500);

            // Mark options
            this.examOptions.querySelectorAll('.option').forEach(opt => {
                opt.classList.add('disabled');
                if (opt.dataset.letter === correctAnswer) {
                    opt.classList.add('correct');
                    opt.innerHTML += '<span class="option-icon">✓</span>';
                } else if (opt.dataset.letter === letter) {
                    opt.classList.add('incorrect');
                    opt.innerHTML += '<span class="option-icon">✗</span>';
                }
            });

            // Show continue button
            this.waitingForContinue = true;
            this.examContinueBtn?.classList.remove('hidden');
        }

        this.updateExamStats();
        this.updateDashboard();
    }

    showHint() {
        if (this.hintUsed) return;
        this.hintUsed = true;
        this.hintBtn?.classList.add('used');

        const q = this.examQuestions[this.examIndex];
        const options = q._shuffledOptions || q.options;
        const correctOption = options.find(o =>
            o.letter === (q._shuffledCorrect || q.correct_answer)
        );

        if (!correctOption) return;

        // Find keywords in correct answer
        const answerWords = correctOption.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const questionText = q.text.toLowerCase();

        // Highlight matching words
        let highlightedQuestion = q.text;
        let highlightedOptions = new Map();

        answerWords.forEach(word => {
            if (questionText.includes(word)) {
                const regex = new RegExp(`(${word})`, 'gi');
                highlightedQuestion = highlightedQuestion.replace(regex, '<span class="highlight">$1</span>');
            }
        });

        this.examQuestionText.innerHTML = highlightedQuestion;

        // Also highlight in options
        this.examOptions.querySelectorAll('.option-text').forEach(optText => {
            let html = optText.textContent;
            answerWords.forEach(word => {
                if (html.toLowerCase().includes(word)) {
                    const regex = new RegExp(`(${word})`, 'gi');
                    html = html.replace(regex, '<span class="highlight">$1</span>');
                }
            });
            optText.innerHTML = html;
        });
    }

    handleExamContinue() {
        if (!this.waitingForContinue) return;
        this.waitingForContinue = false;
        this.examContinueBtn?.classList.add('hidden');
        this.advanceExam();
    }

    advanceExam() {
        if (this.examIndex < this.examQuestions.length - 1) {
            this.examIndex++;
            this.renderExamQuestion();
        } else {
            this.showExamResults();
        }
    }

    showExamResults() {
        const total = this.examQuestions.length;
        let correct = 0;

        Object.keys(this.examAnswers).forEach(idx => {
            const q = this.examQuestions[idx];
            const userAnswer = this.examAnswers[idx];
            const correctAnswer = q._shuffledCorrect || q.correct_answer;
            if (userAnswer === correctAnswer) correct++;
        });

        const percentage = Math.round((correct / total) * 100);

        this.resultScoreDisplay.textContent = `${percentage}%`;
        this.resultDetail.textContent = `Đúng: ${correct} / ${total} câu (${this.examScore} điểm)`;

        if (percentage >= 90) {
            this.resultEmoji.textContent = '🎉';
            this.resultMessage.textContent = 'Xuất sắc! Bạn đã nắm vững kiến thức!';
        } else if (percentage >= 70) {
            this.resultEmoji.textContent = '👍';
            this.resultMessage.textContent = 'Khá tốt! Cần ôn thêm một chút.';
        } else if (percentage >= 50) {
            this.resultEmoji.textContent = '📚';
            this.resultMessage.textContent = 'Cần cố gắng thêm!';
        } else {
            this.resultEmoji.textContent = '💪';
            this.resultMessage.textContent = 'Cần học lại lý thuyết từ đầu!';
        }

        if (this.wrongAnswers.length > 0) {
            this.reviewWrongBtn.classList.remove('hidden');
            this.reviewWrongBtn.textContent = `📝 Ôn lại ${this.wrongAnswers.length} câu sai`;
        } else {
            this.reviewWrongBtn.classList.add('hidden');
        }

        this.resultModal?.classList.add('active');
    }

    startReviewWrong() {
        if (this.wrongAnswers.length === 0) return;

        this.resultModal?.classList.remove('active');

        // Filter to only wrong questions
        this.examQuestions = this.allData.questions.filter(q =>
            this.wrongAnswers.includes(q.question)
        );
        this.shuffleArray(this.examQuestions);
        this.examIndex = 0;
        this.examAnswers = {};
        this.examScore = 0;
        this.wrongAnswers = [];

        this.renderExamQuestion();
        this.updateExamStats();
    }

    restartExam() {
        this.resultModal?.classList.remove('active');
        this.startExam(this.examChapterSelect?.value || 'all');
    }

    // ===== UTILITIES =====
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    handleKeyboard(e) {
        // Modal open? Press Enter to restart
        if (this.resultModal?.classList.contains('active')) {
            if (e.key === 'Enter') {
                this.restartExam();
            }
            return;
        }

        // Only handle on exam tab
        if (this.currentTab !== 'exam') return;

        const keyMap = {
            '1': 'A', '2': 'B', '3': 'C', '4': 'D',
            'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
            'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D'
        };

        if (keyMap[e.key] && !this.waitingForContinue) {
            e.preventDefault();
            this.selectExamAnswer(keyMap[e.key]);
        }

        if (e.key === 'Enter' && this.waitingForContinue) {
            e.preventDefault();
            this.handleExamContinue();
        }

        if ((e.key === 'h' || e.key === 'H') && !this.hintUsed) {
            e.preventDefault();
            this.showHint();
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
});

// Reset daily stats at midnight
const now = new Date();
const lastReset = localStorage.getItem('lastReset');
const today = now.toDateString();

if (lastReset !== today) {
    localStorage.setItem('studiedToday', '0');
    localStorage.setItem('lastReset', today);
}
