// ===== Common Utilities =====

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('quiz-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('quiz-theme', next);
    updateThemeIcon(next);
}

// Data Loading
const quizData = {
    chapters: [],
    questions: [],
    studyTopics: []
};

async function loadAllData() {
    const files = ['exam/chuong_1.json', 'exam/chuong_2.json', 'exam/chuong_3.json'];

    for (const file of files) {
        try {
            let data;
            if (window.QUIZ_DATA && window.QUIZ_DATA[file]) {
                data = window.QUIZ_DATA[file];
            } else {
                const response = await fetch(file);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                data = await response.json();
            }

            const chapterNum = typeof data.chapter === 'string'
                ? parseInt(data.chapter.match(/\d+/)[0])
                : data.chapter;

            quizData.chapters.push({
                file,
                chapter: chapterNum,
                questions: data.questions
            });

            quizData.questions.push(...data.questions.map(q => ({
                ...q,
                // Normalize: support both 'text' and 'question' for question text
                text: q.text || q.question,
                // Normalize: support both 'correct_answer' and 'answer'
                correct_answer: q.correct_answer || q.answer,
                // Normalize options: support both {letter, text} and {id, content}
                options: (q.options || []).map(opt => ({
                    letter: opt.letter || opt.id,
                    text: opt.text || opt.content
                })),
                // Normalize explanation
                explanation: q.explanation || q.explain,
                chapter: chapterNum,
                file
            })));

        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }

    return quizData;
}

async function loadStudyData() {
    try {
        const response = await fetch('study_data.json');
        if (!response.ok) throw new Error('Failed to load study data');
        quizData.studyTopics = await response.json();
        return quizData.studyTopics;
    } catch (error) {
        console.error('Error loading study data:', error);
        return [];
    }
}

function getQuestionsByChapter(chapter) {
    if (!chapter || chapter === 'all') {
        return quizData.questions;
    }

    let chapterNum = parseInt(chapter);
    if (isNaN(chapterNum) && typeof chapter === 'string') {
        const match = chapter.match(/chuong_(\d+)/i) || chapter.match(/(\d+)/);
        if (match) {
            chapterNum = parseInt(match[1]);
        }
    }

    if (!isNaN(chapterNum) && chapterNum > 0) {
        return quizData.questions.filter(q => q.chapter === chapterNum);
    }

    return quizData.questions.filter(q => q.file === chapter);
}

// Utility Functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Stats Management
function getStats() {
    return {
        studiedToday: parseInt(localStorage.getItem('studiedToday') || '0'),
        totalCorrect: parseInt(localStorage.getItem('totalCorrect') || '0'),
        totalAnswered: parseInt(localStorage.getItem('totalAnswered') || '0')
    };
}

function updateStats(updates) {
    const stats = getStats();
    Object.keys(updates).forEach(key => {
        stats[key] = (stats[key] || 0) + updates[key];
        localStorage.setItem(key, stats[key]);
    });
    return stats;
}

// Reset daily stats at midnight
function checkDailyReset() {
    const now = new Date();
    const lastReset = localStorage.getItem('lastReset');
    const today = now.toDateString();

    if (lastReset !== today) {
        localStorage.setItem('studiedToday', '0');
        localStorage.setItem('lastReset', today);
    }
}

// Navigation highlighting
function highlightCurrentNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const href = tab.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// Mobile menu toggle
function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            menuToggle.textContent = mainNav.classList.contains('active') ? '✕' : '☰';
        });

        // Close menu when clicking on a nav link
        mainNav.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                mainNav.classList.remove('active');
                menuToggle.textContent = '☰';
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
                mainNav.classList.remove('active');
                menuToggle.textContent = '☰';
            }
        });
    }
}

// Initialize common functionality
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkDailyReset();
    highlightCurrentNav();
    initMobileMenu();

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle?.addEventListener('click', toggleTheme);

    initSupportFeature();
});

/* Support Feature */
function initSupportFeature() {
    const nav = document.querySelector('.main-nav');
    if (nav) {
        // Create Support Link
        const supportLink = document.createElement('a');
        supportLink.className = 'nav-tab';
        supportLink.href = '#';
        supportLink.innerHTML = `
            <span class="tab-icon">☕</span>
            <span class="tab-text">Ủng hộ</span>
        `;

        supportLink.addEventListener('click', (e) => {
            e.preventDefault();

            // Ask for confirmation (Strict requirement)
            if (confirm('Bạn có muốn ủng hộ team phát triển không? ❤️')) {
                showSupportModal();
            }
        });

        nav.appendChild(supportLink);
    }
}

function showSupportModal() {
    let modal = document.getElementById('support-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'support-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="result-emoji">💖</div>
                <h2>Cảm ơn tấm lòng của bạn!</h2>
                <p class="support-message">Sự ủng hộ của bạn là động lực to lớn giúp bọn mình duy trì server và phát triển thêm nhiều tính năng hay ho.</p>
                <div class="qr-container">
                    <img src="assets/photos/qr.png" alt="QR Code" class="qr-image" onerror="this.src='https://via.placeholder.com/200?text=QR+Code'">
                    <p class="text-secondary text-sm" style="margin-top:8px">Quét mã QR để ủng hộ</p>
                </div>
                <div class="result-actions">
                    <button class="action-btn primary" onclick="document.getElementById('support-modal').classList.remove('active')">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close overlay
        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Small delay to allow DOM insertion before adding active class (for animation)
    requestAnimationFrame(() => {
        setTimeout(() => modal.classList.add('active'), 10);
    });
}
