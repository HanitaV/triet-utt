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
    // Ensure subject config is loaded first
    await loadSubjectsList();
    await loadCurrentSubjectConfig();

    await loadAllData();

    // Load study topics from subject folder
    try {
        const subject = subjectsData.find(s => s.id === getCurrentSubjectId());
        const studyDataPath = subject ? `${subject.path}/study_data.json` : 'study_data.json';
        const response = await fetch(`${studyDataPath}?v=${Date.now()}`);
        studyTopics = await response.json();
    } catch (err) {
        console.error('Error loading study data:', err);
        return;
    }


    initStudyElements();
    initStudyEventListeners();
    renderTopicList();

    // Check URL for auto-select
    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedSubject = urlParams.get('subject');
    const preSelectedTopic = urlParams.get('topic');
    const preSelectedVideo = urlParams.get('video');

    // Handle deep link subject switch
    if (preSelectedSubject && preSelectedSubject !== getCurrentSubjectId()) {
        setCurrentSubject(preSelectedSubject);
        return; // Stop init, reload will happen
    }


    if (preSelectedTopic !== null) {
        const idx = parseInt(preSelectedTopic);
        if (!isNaN(idx) && idx >= 0 && idx < studyTopics.length) {
            // Scroll to view
            setTimeout(() => {
                selectTopic(idx);
                document.getElementById('topic-detail')?.scrollIntoView({ behavior: 'smooth' });

                // If specific video requested
                if (preSelectedVideo !== null) {
                    const vIdx = parseInt(preSelectedVideo);
                    const topic = studyTopics[idx];
                    if (topic && topic.videos && topic.videos[vIdx]) {
                        setTimeout(() => {
                            playVideo(topic.videos[vIdx].videoId);
                            // Update URL to be clean? No, maybe keep it.
                        }, 500);
                    }
                }
            }, 100);
        }
    }
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

    // Render dynamic chapter tabs
    renderChapterTabs();
}

function renderChapterTabs() {
    const tabsContainer = document.querySelector('.chapter-tabs');
    if (!tabsContainer || !currentSubjectData || !currentSubjectData.chapters) return;

    const chapters = currentSubjectData.chapters;
    let html = '<button class="chapter-tab active" data-chapter="all">Tất cả</button>';

    chapters.forEach(ch => {
        html += `<button class="chapter-tab" data-chapter="${ch.id}">${ch.name.startsWith('Chương') ? '' : '📘 '} ${ch.name}</button>`;
    });

    tabsContainer.innerHTML = html;
}


function initStudyEventListeners() {
    // Chapter tabs
    // Chapter tabs (using delegation)
    const tabsContainer = document.querySelector('.chapter-tabs');
    tabsContainer?.addEventListener('click', (e) => {
        const tab = e.target.closest('.chapter-tab');
        if (!tab) return;

        document.querySelectorAll('.chapter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentChapter = tab.dataset.chapter;
        renderTopicList();
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

    // Share button
    document.getElementById('share-topic-btn')?.addEventListener('click', () => {
        if (currentTopicIdx !== null) shareTopic(currentTopicIdx);
    });
}

function renderTopicList() {
    if (!topicList) return;

    const filteredTopics = studyTopics.filter(topic => {
        if (currentChapter === 'all') return true;
        return topic.chapters.some(c => c == currentChapter);
    });

    document.getElementById('topic-count').textContent = `${filteredTopics.length} chủ đề`;

    const subjectId = getCurrentSubjectId();

    topicList.innerHTML = filteredTopics.map((topic, idx) => {
        const originalIdx = studyTopics.indexOf(topic);
        const questionCount = getTopicQuestionCount(topic);
        const chapterText = topic.chapters.map(c => `C${c}`).join(', ');
        const isActive = currentTopicIdx === originalIdx;

        // Progress check
        const stats = ProgressManager.getTopicStats(subjectId, originalIdx, topic);
        let statusIcon = topic.icon || '📚';
        let progressHtml = '';

        if (stats && (stats.attempts > 0 || stats.completion > 0)) {
            if (stats.completion >= 100 && stats.accuracy >= 80) statusIcon = '✅';

            progressHtml = `
                <div class="topic-progress-container">
                    <div class="progress-row">
                        <span class="progress-label">Hoàn thành: ${stats.completion}%</span>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${stats.completion}%"></div>
                        </div>
                    </div>
                    <div class="progress-row">
                         <span class="progress-label">Đúng: ${stats.accuracy}%</span>
                         <span class="progress-badge ${stats.accuracy >= 80 ? 'good' : 'average'}">${stats.accuracy}%</span>
                    </div>
                </div>
             `;
        }

        return `
            <div class="topic-item ${isActive ? 'active' : ''}" data-idx="${originalIdx}" onclick="selectTopic(${originalIdx})">
                <span class="topic-item-icon">${statusIcon}</span>
                <div class="topic-item-info">
                    <div class="topic-item-title">${topic.title}</div>
                    <div class="topic-item-meta">${chapterText} • ${topic.videos?.length || 0} video</div>
                    ${progressHtml}
                </div>
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

    const subjectId = getCurrentSubjectId();

    // Videos
    if (videoGrid && topic.videos) {
        videoGrid.innerHTML = topic.videos.map((video, vIdx) => {
            const videoQuestionCount = getVideoQuestionCount(video);

            // Get Video Progress
            const vProg = ProgressManager.getVideoProgress(subjectId, currentTopicIdx, vIdx);
            let badge = '';
            if (vProg) {
                const isGood = vProg.lastScore >= 80;
                badge = `<span class="video-score-badge ${isGood ? 'good' : 'average'}">${vProg.lastScore}%</span>`;
            }

            return `
            <div class="video-card">
                <div class="video-thumbnail" onclick="playVideo('${video.videoId}')">
                    <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" 
                         alt="${video.title}"
                         onerror="this.src='https://via.placeholder.com/320x180?text=Video'">
                    <div class="play-overlay">▶</div>
                    ${badge}
                </div>
                <div class="video-card-info">
                    <div class="video-card-title">${video.title}</div>
                    <div class="video-card-meta">
                        <span class="video-question-badge">${videoQuestionCount} câu hỏi</span>
                        ${videoQuestionCount > 0 ? `
                            <button class="video-practice-btn" onclick="event.stopPropagation(); startVideoPractice(${currentTopicIdx}, ${vIdx})">
                                Luyện tập
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `}).join('');
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
        // practiceAllBtn.disabled = questionCount === 0; 
    }

    renderShareButton(topic, currentTopicIdx);

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

function getVideoQuestionCount(video) {
    if (!video.questionIds) return 0;
    let count = 0;
    for (const ids of Object.values(video.questionIds)) {
        count += ids.length;
    }
    return count;
}

function findVideoQuestions(video) {
    if (!window.quizData.questions || !video.questionIds) return [];

    let questions = [];

    for (const [chapter, ids] of Object.entries(video.questionIds)) {
        // Support string chapter IDs
        const chapterQuestions = window.quizData.questions.filter(q =>
            (q.chapter == chapter) && ids.includes(q.id)
        );
        questions = questions.concat(chapterQuestions);
    }

    return questions;
}

function startVideoPractice(topicIdx, videoIdx) {
    const topic = studyTopics[topicIdx];
    if (!topic || !topic.videos || !topic.videos[videoIdx]) return;

    const video = topic.videos[videoIdx];
    const relatedQuestions = findVideoQuestions(video);

    if (relatedQuestions.length === 0) {
        alert('Không có câu hỏi liên quan đến video này.');
        return;
    }

    // Store questions in localStorage and redirect to exam
    localStorage.setItem('practiceQuestions', JSON.stringify(relatedQuestions));
    localStorage.setItem('practiceTopicName', video.title);
    localStorage.setItem('practiceSource', 'study');
    localStorage.setItem('practiceTopicIdx', topicIdx.toString());
    localStorage.setItem('practiceVideoIdx', videoIdx.toString()); // New: Track video
    window.location.href = 'exam.html?practice=true';
}

function findRelatedQuestions(topic) {
    if (!window.quizData.questions || !topic.questionIds) return [];

    let questions = [];

    for (const [chapter, ids] of Object.entries(topic.questionIds)) {
        // Support string chapter IDs
        const chapterQuestions = window.quizData.questions.filter(q =>
            (q.chapter == chapter) && ids.includes(q.id)
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

    // Store questions in localStorage and redirect to exam
    localStorage.setItem('practiceQuestions', JSON.stringify(relatedQuestions));
    localStorage.setItem('practiceTopicName', topic.title);
    localStorage.setItem('practiceSource', 'study');
    localStorage.setItem('practiceTopicIdx', topicIdx.toString());
    window.location.href = 'exam.html?practice=true';
}

function renderShareButton(topic, idx) {
    const actionsDiv = document.querySelector('.topic-actions');
    if (!actionsDiv) return;

    // Check if button already exists
    let shareBtn = document.getElementById('share-topic-btn');
    if (!shareBtn) {
        shareBtn = document.createElement('button');
        shareBtn.id = 'share-topic-btn';
        shareBtn.className = 'btn btn-secondary';
        shareBtn.innerHTML = '🔗 Chia sẻ';
        shareBtn.onclick = () => shareTopic(idx);
        actionsDiv.insertBefore(shareBtn, actionsDiv.firstChild);
    }
}

function shareTopic(idx) {
    const subjectId = getCurrentSubjectId();
    const url = `${window.location.origin}${window.location.pathname}?subject=${subjectId}&topic=${idx}`;

    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('share-topic-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Đã sao chép!';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Không thể sao chép liên kết');
    });
}

// Add sidebar overlay to body
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initStudy);
