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
        this.initExamTab(); // Initialize Exam Elements
        await this.loadAllData();
        this.initStudyTab();
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
        // Nội dung sẽ được thêm vào đây

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

        // Exam elements are now initialized in initExamTab
        // Modal elements are now initialized in initExamTab
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

        // Study tab
        // Nội dung sẽ được thêm vào đây

        // Flashcard
        this.flashcard?.addEventListener('click', () => this.flipFlashcard());
        this.forgotBtn?.addEventListener('click', () => this.handleFlashcardForgot());
        this.rememberedBtn?.addEventListener('click', () => this.handleFlashcardRemembered());
        this.shuffleFlashcardsBtn?.addEventListener('click', () => this.shuffleFlashcardDeck());
        this.flashcardChapterSelect?.addEventListener('change', () => this.loadFlashcards());

        // Exam event listeners are now in initExamTab

        // Modal event listeners are now in initExamTab

        // Keyboard shortcuts
        // Exam keyboard shortcuts are now in initExamTab
        document.addEventListener('keydown', (e) => this.handleKeyboard(e)); // Keep general keyboard handler
    }

    // New method for Exam tab initialization
    initExamTab() {
        this.examChapterSelect = document.getElementById('exam-chapter-select');
        this.shuffleAnswersToggle = document.getElementById('shuffle-answers-toggle');
        this.examQuestionNumber = document.getElementById('exam-question-number');
        this.hintBtn = document.getElementById('hint-btn');
        this.examQuestionText = document.getElementById('exam-question-text');
        this.examOptions = document.getElementById('exam-options');
        this.examContinueBtn = document.getElementById('exam-continue-btn');
        this.examRestartBtn = document.getElementById('exam-restart-btn');
        this.examScoreSpan = document.getElementById('exam-score');
        this.examCurrentSpan = document.getElementById('exam-current');
        this.examTotalSpan = document.getElementById('exam-total');
        this.examCorrectSpan = document.getElementById('exam-correct');
        this.examIncorrectSpan = document.getElementById('exam-incorrect');
        this.examProgress = document.getElementById('exam-progress'); // Assuming this is the fill element

        // Modal
        this.resultModal = document.getElementById('result-modal');
        this.resultEmoji = document.getElementById('result-emoji');
        this.resultScoreDisplay = document.getElementById('result-score-display');
        this.resultDetail = document.getElementById('result-detail');
        this.resultMessage = document.getElementById('result-message');
        this.reviewWrongBtn = document.getElementById('review-wrong-btn');
        this.modalRestartBtn = document.getElementById('modal-restart-btn');

        // New Element for Explanation
        this.examExplanation = document.getElementById('exam-explanation');

        // Events
        this.examChapterSelect?.addEventListener('change', () => this.startExam(this.examChapterSelect.value));
        this.shuffleAnswersToggle?.addEventListener('change', () => {
            this.shuffleAnswers = this.shuffleAnswersToggle.checked;
        });
        this.examRestartBtn?.addEventListener('click', () => this.restartExam());
        this.modalRestartBtn?.addEventListener('click', () => {
            this.resultModal.classList.remove('active'); // Assuming closeModal() is this
            this.restartExam();
        });
        this.reviewWrongBtn?.addEventListener('click', () => {
            this.resultModal.classList.remove('active'); // Assuming closeModal() is this
            this.startReviewWrong();
        });

        this.hintBtn?.addEventListener('click', () => this.showHint());
        this.examContinueBtn?.addEventListener('click', () => this.handleExamContinue());

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
                let data;
                // Ưu tiên lấy từ biến toàn cục (cho môi trường local file://)
                if (window.QUIZ_DATA && window.QUIZ_DATA[file]) {
                    data = window.QUIZ_DATA[file];
                } else {
                    const response = await fetch(file);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    data = await response.json();
                }

                this.allData.chapters.push({
                    file,
                    chapter: typeof data.chapter === 'string' ? parseInt(data.chapter.match(/\d+/)[0]) : data.chapter,
                    questions: data.questions
                });

                // Gộp tất cả câu hỏi vào mảng chung để tính tổng
                this.allData.questions.push(...data.questions.map(q => ({
                    ...q,
                    chapter: typeof data.chapter === 'string' ? parseInt(data.chapter.match(/\d+/)[0]) : data.chapter,
                    file
                })));
                this.allData.totalQuestions += data.questions.length;

            } catch (error) {
                console.error(`Lỗi khi tải dữ liệu ${file}:`, error);
                // Hiển thị thông báo lỗi trên UI nếu cần
            }
        }

        // Cập nhật UI dashboard sau khi tải xong
        this.updateDashboard();
    }

    updateDashboard() {
        // Update chapter counts
        const counts = { 1: 0, 2: 0, 3: 0 };
        this.allData.chapters.forEach((ch, i) => {
            counts[ch.chapter] = ch.questions.length; // Use ch.chapter directly
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

    // ===== STUDY TAB METHODS =====
    async initStudyTab() {
        this.topicsContainer = document.getElementById('topics-container');
        this.studyTabs = document.querySelectorAll('.study-tab');

        this.studyTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all
                this.studyTabs.forEach(t => t.classList.remove('active'));
                // Add to clicked
                tab.classList.add('active');
                this.renderStudyTopics();
            });
        });

        await this.loadStudyData();
    }

    async loadStudyData() {
        try {
            const response = await fetch('study_data.json');
            if (!response.ok) throw new Error('Failed to load study data');
            this.studyTopics = await response.json();
            this.renderStudyTopics();
        } catch (error) {
            console.error('Error loading study data:', error);
            if (this.topicsContainer) {
                this.topicsContainer.innerHTML = '<p class="error-text">Lỗi tải dữ liệu bài học.</p>';
            }
        }
    }

    renderStudyTopics() {
        const activeTab = document.querySelector('.study-tab.active');
        const chapterFilter = activeTab ? activeTab.dataset.chapter : '1';
        let sections = this.studyTopics;

        if (chapterFilter !== 'all') {
            sections = sections.filter(s => s.chapter === parseInt(chapterFilter));
        }

        if (!this.topicsContainer) return;

        this.topicsContainer.innerHTML = sections.map(section => `
            <div class="study-section">
                <h2 class="section-title">${section.sectionTitle}</h2>
                <div class="section-content">
                    ${section.topics.map((topic, tIdx) => {
            const relatedQuestions = this.findRelatedQuestions(topic, section.chapter);
            // Generate unique ID for practice button logic
            const globalTopicId = `${section.chapter}-${tIdx}`;

            return `
                        <div class="topic-card" data-chapter="${section.chapter}">
                            <div class="topic-header">
                                <h3 class="topic-title">${topic.title}</h3>
                            </div>

                            ${topic.localPath ? `
                            <div class="topic-video">
                                <div class="video-container local-video">
                                    <video controls width="100%">
                                        <source src="${topic.localPath}" type="video/mp4">
                                        Trình duyệt của bạn không hỗ trợ thẻ video.
                                    </video>
                                </div>
                            </div>
                            ` : topic.videoId ? `
                            <div class="topic-video">
                                <div class="video-container">
                                    <iframe src="https://www.youtube.com/embed/${topic.videoId}" title="${topic.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="topic-theory">
                                <h4>📚 Lý thuyết</h4>
                                <div class="theory-content">${topic.theory}</div>
                            </div>
                            
                            <div class="topic-tips">
                                <h4>💡 Mẹo ghi nhớ</h4>
                                <ul>
                                    ${topic.tips.map(tip => `<li>${tip}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div class="topic-questions">
                                <h4>📝 Câu hỏi liên quan (${relatedQuestions.length} câu)</h4>
                                ${relatedQuestions.length > 0 ? `
                                    <button class="practice-btn" data-section-idx="${this.studyTopics.indexOf(section)}" data-topic-idx="${tIdx}">
                                        🎯 Luyện tập ${relatedQuestions.length} câu này
                                    </button>
                                ` : '<p class="no-questions">Không tìm thấy câu hỏi liên quan</p>'}
                            </div>
                        </div>
                        `;
        }).join('')}
                </div>
            </div>
        `).join('');

        // Add event listeners for practice buttons
        this.topicsContainer.querySelectorAll('.practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sIdx = parseInt(e.target.dataset.sectionIdx);
                const tIdx = parseInt(e.target.dataset.topicIdx);
                this.startTopicPractice(sIdx, tIdx);
            });
        });
    }

    findRelatedQuestions(topic, chapter) {
        let questions = this.allData.questions;

        // 1. Filter by Chapter
        if (chapter) {
            questions = questions.filter(q => q.chapter === parseInt(chapter));
        }

        // 2. Filter by IDs (Priority) if available
        if (topic.questionIds && topic.questionIds.length > 0) {
            return questions.filter(q => topic.questionIds.includes(q.question));
        }

        // 3. Fallback to Keywords (Legacy)
        return questions.filter(q => {
            const questionText = (q.text + ' ' + q.options.map(o => o.text).join(' ')).toLowerCase();
            return topic.keywords.some(keyword => questionText.includes(keyword.toLowerCase()));
        });
    }

    startTopicPractice(sIdx, tIdx) {
        const section = this.studyTopics[sIdx];
        const topic = section?.topics[tIdx];
        if (!topic) return;

        const relatedQuestions = this.findRelatedQuestions(topic, section.chapter);
        if (relatedQuestions.length === 0) return;

        // Set exam questions to related questions only
        this.examQuestions = [...relatedQuestions];
        if (this.shuffleAnswers) {
            this.shuffleArray(this.examQuestions);
        }
        this.examIndex = 0;
        this.examAnswers = {};
        this.examScore = 0;
        this.wrongAnswers = [];
        this.waitingForContinue = false;

        // Switch to exam tab
        this.switchTab('exam');
        this.renderExamQuestion();
        this.updateExamStats();
    }

    loadStudyContent() {
        this.renderStudyTopics();
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
    getQuestionsByChapter(chapter) {
        if (!chapter || chapter === 'all') {
            return this.allData.questions;
        }

        // Try to parse chapter number from string (e.g. "exam/chuong_1.json" -> 1)
        let chapterNum = parseInt(chapter);
        if (isNaN(chapterNum) && typeof chapter === 'string') {
            const match = chapter.match(/chuong_(\d+)/i) || chapter.match(/(\d+)/);
            if (match) {
                chapterNum = parseInt(match[1]);
            }
        }

        if (!isNaN(chapterNum) && chapterNum > 0) {
            return this.allData.questions.filter(q => q.chapter === chapterNum);
        }

        // Fallback to file path match
        return this.allData.questions.filter(q => q.file === chapter);
    }

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

        // Chỉ trộn đề khi toggle được bật
        if (this.shuffleAnswers) {
            this.shuffleArray(this.examQuestions);
        }
        this.examIndex = 0;
        this.examAnswers = {};
        this.examScore = 0;
        this.wrongAnswers = [];
        this.waitingForContinue = false;

        this.renderExamQuestion();
        this.updateExamStats();
    }

    renderExamQuestion() {
        // Clear previous explanation
        if (this.examExplanation) {
            this.examExplanation.classList.add('hidden');
            this.examExplanation.innerHTML = '';
        }

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

        // --- RENDER EXPLANATION (Only if incorrect) ---
        if (!isCorrect && this.examExplanation) {
            const explanationText = q.explanation || "Không có giải thích chi tiết cho câu hỏi này.";
            this.examExplanation.innerHTML = `
                <div class="explanation-box">
                    <div class="explanation-header">
                        <span class="gemini-badge">Gemini 3.0 PRO</span>
                    </div>
                    <div class="explanation-text">${explanationText}</div>
                </div>
            `;
            this.examExplanation.classList.remove('hidden');
        }

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

            // Show continue button even if correct, so user can read explanation
            this.waitingForContinue = true;
            this.examContinueBtn?.classList.remove('hidden');

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
        // this.updateDashboard(); // Optimization: Update on exit
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
