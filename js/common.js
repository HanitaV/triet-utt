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

// ===== Subject Management (Multi-Subject Support) =====
let subjectsData = [];
let currentSubjectData = null;

function getCurrentSubjectId() {
    return localStorage.getItem('current-subject') || 'triet-mac-lenin';
}

function setCurrentSubject(subjectId) {
    localStorage.setItem('current-subject', subjectId);
    window.location.reload();
}

async function loadSubjectsList() {
    try {
        const response = await fetch('subjects.json?v=' + Date.now());
        subjectsData = await response.json();
        return subjectsData;
    } catch (error) {
        console.error('Error loading subjects:', error);
        return [];
    }
}

async function loadCurrentSubjectConfig() {
    const subjectId = getCurrentSubjectId();
    const subject = subjectsData.find(s => s.id === subjectId);
    if (!subject) return null;
    try {
        const response = await fetch(`${subject.path}/subject.json?v=${Date.now()}`);
        currentSubjectData = await response.json();
        return currentSubjectData;
    } catch (error) {
        console.error('Error loading subject config:', error);
        return null;
    }
}

function getExamFilesPath() {
    if (!currentSubjectData) return 'exam';
    const subject = subjectsData.find(s => s.id === currentSubjectData.id);
    const examPath = currentSubjectData.examPath || 'exam';
    return subject ? `${subject.path}/${examPath}` : 'exam';
}

function getChapterFiles() {
    if (!currentSubjectData || !currentSubjectData.chapters) return [];
    const basePath = getExamFilesPath();
    return currentSubjectData.chapters.map(ch => `${basePath}/${ch.file}`);
}


function updateHeaderWithSubject() {
    const subjectId = getCurrentSubjectId();
    const subject = subjectsData.find(s => s.id === subjectId);
    if (!subject) return;
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.innerHTML = `${subject.icon} ${subject.shortName}`;
        logo.title = `${subject.name} - ${subject.school}`;
    }
}

function createSubjectSelector() {
    const headerContent = document.querySelector('.header-content');
    if (!headerContent || subjectsData.length < 2) return;
    const currentSubjectId = getCurrentSubjectId();
    const currentSubject = subjectsData.find(s => s.id === currentSubjectId);

    const selector = document.createElement('div');
    selector.className = 'subject-selector';
    selector.innerHTML = `
        <button class="subject-btn" title="Chọn môn học">
            <span class="subject-icon">${currentSubject?.icon || '📚'}</span>
            <span class="subject-name-short">${currentSubject?.shortName || 'Môn học'}</span>
            <span class="dropdown-arrow">▼</span>
        </button>
        <div class="subject-dropdown">
            ${subjectsData.map(s => `
                <div class="subject-option ${s.id === currentSubjectId ? 'active' : ''}" data-subject="${s.id}">
                    <span class="opt-icon">${s.icon}</span>
                    <div class="opt-info">
                        <span class="opt-name">${s.name}</span>
                        <span class="opt-school">${s.shortSchool}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    const themeToggle = headerContent.querySelector('.theme-toggle');
    if (themeToggle) headerContent.insertBefore(selector, themeToggle);
    else headerContent.appendChild(selector);

    const btn = selector.querySelector('.subject-btn');
    const dropdown = selector.querySelector('.subject-dropdown');
    btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); });
    selector.querySelectorAll('.subject-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const subjectId = opt.dataset.subject;
            if (subjectId !== currentSubjectId) setCurrentSubject(subjectId);
        });
    });
    document.addEventListener('click', () => dropdown.classList.remove('active'));
}

// Data Loading
const quizData = {
    chapters: [],
    questions: [],
    studyTopics: []
};


async function loadAllData() {
    const files = getChapterFiles();


    for (const file of files) {
        try {
            let data;
            if (window.QUIZ_DATA && window.QUIZ_DATA[file]) {
                data = window.QUIZ_DATA[file];
            } else {
                // Add timestamp to prevent caching
                const response = await fetch(`${file}?v=${new Date().getTime()}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                data = await response.json();
            }
            // Extract chapter number from 'chapter' or 'title' field, or fallback to filename
            let chapterNum = 0;
            if (data.chapter) {
                chapterNum = data.chapter;
            } else if (data.title) {
                const match = data.title.match(/\d+/);
                if (match) chapterNum = parseInt(match[0]);
            }

            // Fallback to filename (e.g., "1.json")
            if (!chapterNum || chapterNum === 0) {
                const fileMatch = file.match(/\/(\d+)\.json$/) || file.match(/^(\d+)\.json$/);
                if (fileMatch) chapterNum = parseInt(fileMatch[1]);
            }

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
        const response = await fetch(`study_data.json?v=${new Date().getTime()}`);
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
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    checkDailyReset();
    highlightCurrentNav();
    initMobileMenu();

    // Initialize multi-subject support
    await loadSubjectsList();
    await loadCurrentSubjectConfig();
    updateHeaderWithSubject();
    createSubjectSelector();

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
