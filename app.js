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

        // Study tab
        // Nội dung sẽ được thêm vào đây

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

    // ===== STUDY TAB DATA =====
    studyTopics = [
        // CHƯƠNG 1
        {
            chapter: 1,
            title: "Khái luận về Triết học",
            videoId: "pI4Ofd4nWkU", // Triết học 123 (Bài giảng chung)
            theory: "Triết học là hệ thống tri thức lý luận chung nhất của con người về thế giới, về vị trí, vai trò của con người trong thế giới ấy. Triết học ra đời vào khoảng từ thế kỷ VIII đến thế kỷ VI TCN tại các trung tâm văn minh lớn của nhân loại thời Cổ đại (Ấn Độ, Trung Quốc, Hy Lạp).",
            tips: ["🧠 <b>\"8-6 Ấn Trung Hy\"</b>: TK VIII-VI TCN, 3 cái nôi văn minh.", "📌 <b>Nguồn gốc:</b> Nhận thức (tư duy trừu tượng) + Xã hội (lao động trí óc tách khỏi chân tay)."],
            keywords: ["triết học ra đời", "thế kỷ", "ấn độ", "trung quốc", "hy lạp", "khái niệm triết học", "tri thức", "điều kiện", "nguồn gốc"]
        },
        {
            chapter: 1,
            title: "Vấn đề cơ bản của Triết học",
            videoId: "pI4Ofd4nWkU", // Triết học 123
            theory: "Ph.Ăngghen viết: “Vấn đề cơ bản lớn của mọi triết học, đặc biệt là của triết học hiện đại, là vấn đề quan hệ giữa tư duy với tồn tại”. Vấn đề này có hai mặt: 1. Mặt thứ nhất (Bản thể luận): Ý thức hay vật chất có trước? 2. Mặt thứ hai (Nhận thức luận): Con người có khả năng nhận thức thế giới không?",
            tips: ["🧠 <b>Mặt 1 (Bản thể luận):</b> Vật chất hay Ý thức có trước? → Phân định DV/DT.", "🧠 <b>Mặt 2 (Nhận thức luận):</b> Con người có nhận thức được thế giới không? → Phân định Khả tri/Bất khả tri."],
            keywords: ["vấn đề cơ bản", "vật chất", "ý thức", "bản thể luận", "nhận thức luận", "mặt thứ nhất", "mặt thứ hai"]
        },
        {
            chapter: 1,
            title: "Triết học Mác - Lênin",
            videoId: "pI4Ofd4nWkU", // Fallback to same video series
            theory: "Ra đời những năm 40 thế kỷ XIX. C.Mác và Ph.Ăngghen sáng lập, V.I.Lênin phát triển. Kế thừa tinh hoa của Triết học cổ điển Đức, Kinh tế chính trị cổ điển Anh, và CNXH không tưởng Pháp.",
            tips: ["🧠 <b>Mác + Ăngghen sáng lập → Lênin phát triển</b>.", "📌 <b>Tiền đề lý luận:</b> Đức (Triết) - Anh (Kinh tế) - Pháp (CNXH)."],
            keywords: ["triết học mác", "lênin", "sáng lập", "phát triển", "nguồn gốc", "tiền đề", "đức", "anh", "pháp", "1840"]
        },
        // CHƯƠNG 2
        {
            chapter: 2,
            title: "Vật chất và Ý thức",
            videoId: "nlmtgzotDBc", // NNHL: Vật chất & Ý thức
            theory: "<b>Định nghĩa Lênin:</b> “Vật chất là một phạm trù triết học dùng để chỉ thực tại khách quan được đem lại cho con người trong cảm giác, được cảm giác của chúng ta chép lại, chụp lại, phản ánh, và tồn tại không lệ thuộc vào cảm giác”.<br><b>Ý thức:</b> “Là sự phản ánh năng động, sáng tạo thế giới khách quan vào bộ não người, là hình ảnh chủ quan của thế giới khách quan.”",
            tips: ["🧠 <b>Vật chất:</b> Thực tại khách quan (quan trọng nhất) + Cảm giác chép lại.", "🧠 <b>Mối quan hệ:</b> VC quyết định YT, YT tác động lại VC (năng động, sáng tạo)."],
            keywords: ["định nghĩa vật chất", "lênin", "phạm trù", "thực tại khách quan", "cảm giác", "phản ánh", "ý thức", "nguồn gốc", "bản chất", "mối quan hệ"]
        },
        {
            chapter: 2,
            title: "Hai nguyên lý của Phép biện chứng",
            videoId: "S5_rA3wLzhA", // Triết học 123
            theory: "<b>Nguyên lý về mối liên hệ phổ biến:</b> Các sự vật, hiện tượng luôn có sự liên hệ, tác động qua lại lẫn nhau.<br><b>Nguyên lý về sự phát triển:</b> Là quá trình vận động từ thấp đến cao, từ đơn giản đến phức tạp, từ kém hoàn thiện đến hoàn thiện hơn.",
            tips: ["🧠 <b>Liên hệ:</b> Mọi sự vật đều dính dáng đến nhau.", "🧠 <b>Phát triển:</b> Đi lên theo đường xoắn ốc (xoáy trôn ốc)."],
            keywords: ["nguyên lý", "mối liên hệ", "phổ biến", "phát triển", "vận động", "biện chứng", "khách quan"]
        },
        {
            chapter: 2,
            title: "Các quy luật cơ bản của PBC duy vật",
            videoId: "y_F-w6q_F54", // Triết học 123
            theory: "1. <b>Lượng - Chất:</b> Sự thay đổi về lượng dẫn đến sự thay đổi về chất (nhảy vọt).<br>2. <b>Mâu thuẫn:</b> Sự thống nhất và đấu tranh của các mặt đối lập là nguồn gốc của sự phát triển.<br>3. <b>Phủ định của phủ định:</b> Cái mới ra đời thay thế cái cũ nhưng kế thừa hạt nhân hợp lý.",
            tips: ["🧠 <b>Lượng đổi → Chất đổi</b> (tại điểm nút).", "🧠 <b>Mâu thuẫn:</b> Động lực phát triển.", "🧠 <b>Phủ định:</b> Kế thừa, đường xoắn ốc."],
            keywords: ["quy luật", "lượng chất", "mâu thuẫn", "đối lập", "phủ định", "bước nhảy", "điểm nút", "kế thừa"]
        },
        // CHƯƠNG 3
        {
            chapter: 3,
            title: "Lực lượng sản xuất và Quan hệ sản xuất",
            videoId: "d1KpG4q1q7M", // NNHL: LLSX & QHSX
            theory: "<b>LLSX:</b> “Sự kết hợp giữa lao động sống với lao động vật hóa tạo ra sức sản xuất...”.<br><b>QHSX:</b> “Tổng hợp các quan hệ kinh tế - vật chất giữa người với người trong quá trình sản xuất vật chất”.<br><b>Quy luật:</b> LLSX quyết định QHSX; QHSX tác động trở lại LLSX.",
            tips: ["🧠 <b>LLSX = Nội dung (động nhất)</b>; <b>QHSX = Hình thức (ổn định hơn).</b>", "📌 LLSX quyết định → QHSX phù hợp."],
            keywords: ["lực lượng sản xuất", "quan hệ sản xuất", "người lao động", "tư liệu", "sở hữu", "quy luật", "phù hợp", "kìm hãm", "thúc đẩy"]
        },
        {
            chapter: 3,
            title: "Cơ sở hạ tầng và Kiến trúc thượng tầng",
            videoId: "d1KpG4q1q7M", // Reuse LLSX/Context video
            theory: "<b>Cơ sở hạ tầng (CSHT):</b> Toàn bộ những QHSX hợp thành cơ cấu kinh tế của xã hội.<br><b>Kiến trúc thượng tầng (KTTT):</b> Hệ thống quan điểm chính trị, pháp quyền, đạo đức... và các thiết chế xã hội tương ứng (Nhà nước, Đảng...).<br><b>Quy luật:</b> CSHT quyết định KTTT.",
            tips: ["🧠 <b>CSHT = Kinh tế</b>; <b>KTTT = Chính trị - Xã hội</b>.", "📌 Kinh tế quyết định chính trị."],
            keywords: ["cơ sở hạ tầng", "kiến trúc thượng tầng", "quan hệ sản xuất", "kinh tế", "chính trị", "nhà nước", "quyết định"]
        },
        {
            chapter: 3,
            title: "Hình thái kinh tế - xã hội",
            videoId: "d1KpG4q1q7M", // Fallback
            theory: "Sự phát triển của các hình thái kinh tế - xã hội là một quá trình lịch sử - tự nhiên. Cấu trúc HT KT-XH gồm: Lực lượng sản xuất + Quan hệ sản xuất (Cơ sở hạ tầng) + Kiến trúc thượng tầng.",
            tips: ["🧠 <b>Lịch sử - Tự nhiên:</b> Tuân theo quy luật khách quan, không phụ thuộc ý muốn chủ quan.", "📌 5 hình thái: Công xã → Nô lệ → Phong kiến → Tư bản → Cộng sản."],
            keywords: ["hình thái kinh tế", "xã hội", "lịch sử tự nhiên", "cấu trúc", "năm hình thái", "cộng sản"]
        }
    ];

    // ===== STUDY TAB METHODS =====
    initStudyTab() {
        this.studyChapterSelect = document.getElementById('study-chapter-select');
        this.topicsContainer = document.getElementById('topics-container');

        this.studyChapterSelect?.addEventListener('change', () => this.renderStudyTopics());
    }

    renderStudyTopics() {
        const chapter = this.studyChapterSelect?.value || 'all';
        const topics = chapter === 'all'
            ? this.studyTopics
            : this.studyTopics.filter(t => t.chapter === parseInt(chapter));

        if (!this.topicsContainer) return;

        this.topicsContainer.innerHTML = topics.map((topic, idx) => {
            // Tìm câu hỏi liên quan dựa trên keywords
            const relatedQuestions = this.findRelatedQuestions(topic);

            return `
                <div class="topic-card" data-chapter="${topic.chapter}">
                    <div class="topic-header">
                        <div class="header-left">
                            <span class="topic-chapter">Chương ${topic.chapter}</span>
                            <h3 class="topic-title">${topic.title}</h3>
                        </div>
                    </div>

                    ${topic.videoId ? `
                    <div class="topic-video">
                        <div class="video-container">
                            <iframe src="https://www.youtube.com/embed/${topic.videoId}" title="${topic.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="topic-theory">
                        <h4>📚 Lý thuyết</h4>
                        <p>${topic.theory}</p>
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
                            <div class="questions-preview">
                                ${relatedQuestions.slice(0, 3).map(q => `
                                    <div class="question-preview-item">
                                        <span class="q-num">Câu ${q.question}</span>
                                        <span class="q-text">${q.text.substring(0, 80)}${q.text.length > 80 ? '...' : ''}</span>
                                    </div>
                                `).join('')}
                                ${relatedQuestions.length > 3 ? `<p class="more-questions">+${relatedQuestions.length - 3} câu khác</p>` : ''}
                            </div>
                            <button class="practice-btn" data-topic-idx="${idx}">
                                🎯 Luyện tập ${relatedQuestions.length} câu này
                            </button>
                        ` : '<p class="no-questions">Không tìm thấy câu hỏi liên quan</p>'}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for practice buttons
        this.topicsContainer.querySelectorAll('.practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const topicIdx = parseInt(e.target.dataset.topicIdx);
                this.startTopicPractice(topicIdx);
            });
        });
    }

    findRelatedQuestions(topic) {
        const chapterFile = `exam/chuong_${topic.chapter}.json`;
        const chapterData = this.allData.chapters.find(c => c.file === chapterFile);

        if (!chapterData) return [];

        return chapterData.questions.filter(q => {
            const questionText = (q.text + ' ' + q.options.map(o => o.text).join(' ')).toLowerCase();
            return topic.keywords.some(keyword => questionText.includes(keyword.toLowerCase()));
        });
    }

    startTopicPractice(topicIdx) {
        const topic = this.studyTopics[topicIdx];
        if (!topic) return;

        const relatedQuestions = this.findRelatedQuestions(topic);
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
