// ===== Study Page - New Design =====

let studyTopics = [];
let currentTopicIdx = null;
let currentChapter = 'all';

// DOM Elements
let topicList, topicDetail, contentPlaceholder;
let detailIcon, detailTitle, detailChapter, detailQuestions;
let videoGrid, videoPlayerContainer, videoIframe;
let theoryContent, goalsList, tipsList;
let notebookBtn, practiceAllBtn;
let sidebar, sidebarToggle;

async function initStudy() {
    await loadAllData();

    // Load study topics
    try {
        const response = await fetch('study_data.json');
        studyTopics = await response.json();
    } catch (err) {
        console.error('Error loading study data:', err);
        return;
    }

    initStudyElements();
    initStudyEventListeners();
    renderTopicList();
}

function initStudyElements() {
    topicList = document.getElementById('topic-list');
    topicDetail = document.getElementById('topic-detail');
    contentPlaceholder = document.getElementById('content-placeholder');

    detailIcon = document.getElementById('detail-icon');
    detailTitle = document.getElementById('detail-title');
    detailChapter = document.getElementById('detail-chapter');
    detailQuestions = document.getElementById('detail-questions');

    videoGrid = document.getElementById('video-grid');
    videoPlayerContainer = document.getElementById('video-player-container');
    videoIframe = document.getElementById('video-iframe');

    theoryContent = document.getElementById('theory-content');
    goalsList = document.getElementById('goals-list');
    tipsList = document.getElementById('tips-list');

    notebookBtn = document.getElementById('notebook-btn');
    practiceAllBtn = document.getElementById('practice-all-btn');

    sidebar = document.getElementById('study-sidebar');
    sidebarToggle = document.getElementById('sidebar-toggle');
}

function initStudyEventListeners() {
    // Chapter tabs
    document.querySelectorAll('.chapter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.chapter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentChapter = tab.dataset.chapter;
            renderTopicList();
        });
    });

    // Sidebar toggle (mobile)
    sidebarToggle?.addEventListener('click', () => {
        sidebar?.classList.toggle('active');
        document.querySelector('.sidebar-overlay')?.classList.toggle('active');
    });

    // Close sidebar on overlay click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sidebar-overlay')) {
            sidebar?.classList.remove('active');
            e.target.classList.remove('active');
        }
    });

    // Close video
    document.getElementById('close-video')?.addEventListener('click', closeVideo);

    // Practice all button
    practiceAllBtn?.addEventListener('click', () => {
        if (currentTopicIdx !== null) {
            startTopicPractice(currentTopicIdx);
        }
    });
}

function renderTopicList() {
    if (!topicList) return;

    const filteredTopics = studyTopics.filter(topic => {
        if (currentChapter === 'all') return true;
        return topic.chapters.includes(parseInt(currentChapter));
    });

    document.getElementById('topic-count').textContent = `${filteredTopics.length} chủ đề`;

    topicList.innerHTML = filteredTopics.map((topic, idx) => {
        const originalIdx = studyTopics.indexOf(topic);
        const questionCount = getTopicQuestionCount(topic);
        const chapterText = topic.chapters.map(c => `C${c}`).join(', ');
        const isActive = currentTopicIdx === originalIdx;

        return `
            <div class="topic-item ${isActive ? 'active' : ''}" data-idx="${originalIdx}" onclick="selectTopic(${originalIdx})">
                <span class="topic-item-icon">${topic.icon || '📚'}</span>
                <div class="topic-item-info">
                    <div class="topic-item-title">${topic.title}</div>
                    <div class="topic-item-meta">${chapterText} • ${topic.videos?.length || 0} video</div>
                </div>
                <span class="topic-item-count">${questionCount}</span>
            </div>
        `;
    }).join('');
}

function selectTopic(idx) {
    currentTopicIdx = idx;
    const topic = studyTopics[idx];
    if (!topic) return;

    // Update sidebar active state
    document.querySelectorAll('.topic-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.idx) === idx) {
            item.classList.add('active');
        }
    });

    // Show topic detail
    contentPlaceholder?.classList.add('hidden');
    topicDetail?.classList.remove('hidden');

    // Close mobile sidebar
    sidebar?.classList.remove('active');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');

    renderTopicDetail(topic);
}

function renderTopicDetail(topic) {
    const questionCount = getTopicQuestionCount(topic);
    const chapterText = topic.chapters.map(c => `Chương ${c}`).join(', ');

    // Header
    if (detailIcon) detailIcon.textContent = topic.icon || '📚';
    if (detailTitle) detailTitle.textContent = topic.title;
    if (detailChapter) detailChapter.textContent = chapterText;
    if (detailQuestions) detailQuestions.textContent = `${questionCount} câu hỏi`;

    // Videos
    if (videoGrid && topic.videos) {
        videoGrid.innerHTML = topic.videos.map((video, vIdx) => `
            <div class="video-card" onclick="playVideo('${video.videoId}')">
                <div class="video-thumbnail">
                    <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" 
                         alt="${video.title}"
                         onerror="this.src='https://via.placeholder.com/320x180?text=Video'">
                    <div class="play-overlay">▶</div>
                </div>
                <div class="video-card-info">
                    <div class="video-card-title">${video.title}</div>
                    <div class="video-card-meta">
                        ${video.description ? `<span class="video-description">${video.description}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Theory
    if (theoryContent) {
        theoryContent.innerHTML = topic.content || '<p>Chưa có nội dung lý thuyết.</p>';
    }

    // Goals
    if (goalsList && topic.goals) {
        goalsList.innerHTML = topic.goals.map(goal => `<li>${goal}</li>`).join('');
    }

    // Tips
    if (tipsList && topic.tips) {
        tipsList.innerHTML = topic.tips.map(tip => `<div class="tip-item">${tip}</div>`).join('');
    }

    // Actions
    if (notebookBtn && topic.notebookUrl) {
        notebookBtn.href = topic.notebookUrl;
        notebookBtn.classList.remove('hidden');
    }

    if (practiceAllBtn) {
        practiceAllBtn.textContent = `🎯 Luyện tập toàn bộ (${questionCount} câu)`;
        practiceAllBtn.disabled = questionCount === 0;
    }

    // Close any open video
    closeVideo();

    // Scroll to top
    document.querySelector('.study-content')?.scrollTo(0, 0);
}

function getTopicQuestionCount(topic) {
    if (!topic.questionIds) return 0;
    let count = 0;
    for (const ids of Object.values(topic.questionIds)) {
        count += ids.length;
    }
    return count;
}

function findRelatedQuestions(topic) {
    if (!quizData.questions || !topic.questionIds) return [];

    let questions = [];

    for (const [chapter, ids] of Object.entries(topic.questionIds)) {
        const chapterNum = parseInt(chapter);
        const chapterQuestions = quizData.questions.filter(q =>
            q.chapter === chapterNum && ids.includes(q.question)
        );
        questions = questions.concat(chapterQuestions);
    }

    return questions;
}

function playVideo(videoId) {
    if (videoIframe && videoPlayerContainer) {
        videoIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        videoPlayerContainer.classList.remove('hidden');
        videoPlayerContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function closeVideo() {
    if (videoIframe && videoPlayerContainer) {
        videoIframe.src = '';
        videoPlayerContainer.classList.add('hidden');
    }
}

function startTopicPractice(topicIdx) {
    const topic = studyTopics[topicIdx];
    if (!topic) return;

    const relatedQuestions = findRelatedQuestions(topic);
    if (relatedQuestions.length === 0) {
        alert('Không có câu hỏi liên quan đến chủ đề này.');
        return;
    }

    // Store questions in sessionStorage and redirect to exam
    sessionStorage.setItem('practiceQuestions', JSON.stringify(relatedQuestions));
    sessionStorage.setItem('practiceTopicName', topic.title);
    window.location.href = 'exam.html?practice=true';
}

// Add sidebar overlay to body
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initStudy);
