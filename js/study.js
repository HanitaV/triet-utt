// ===== Study Page with NotebookLM Topics =====

let studyTopics = [];
let topicsContainer;

async function initStudy() {
    await loadAllData();
    await loadStudyData();

    topicsContainer = document.getElementById('topics-container');
    studyTopics = quizData.studyTopics || [];

    renderStudyTopics();
}

function renderStudyTopics() {
    if (!topicsContainer) return;

    if (!studyTopics || studyTopics.length === 0) {
        topicsContainer.innerHTML = '<p class="loading-text">Không có nội dung học tập.</p>';
        return;
    }

    topicsContainer.innerHTML = studyTopics.map((topic, idx) => {
        const relatedQuestions = findRelatedQuestions(topic);
        const totalQuestions = relatedQuestions.length;

        return `
            <div class="topic-card" data-topic-id="${topic.id}">
                <div class="topic-header">
                    <span class="topic-icon">${topic.icon || '📚'}</span>
                    <div class="topic-header-content">
                        <h3 class="topic-title">${topic.title}</h3>
                        <div class="topic-meta">
                            <span class="topic-chapter">Chương ${topic.chapters.join(', ')}</span>
                            <span class="topic-questions-count">${totalQuestions} câu hỏi</span>
                        </div>
                    </div>
                </div>

                ${topic.videos && topic.videos.length > 0 ? `
                <div class="topic-videos">
                    <h4>🎬 Video bài giảng (${topic.videos.length})</h4>
                    <div class="videos-list">
                        ${topic.videos.map((video, vIdx) => `
                            <div class="video-item">
                                <div class="video-thumbnail" onclick="playVideo('${video.videoId}', ${idx}, ${vIdx})">
                                    <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" 
                                         alt="${video.title}"
                                         onerror="this.src='https://via.placeholder.com/320x180?text=Video'">
                                    <div class="play-overlay">▶</div>
                                </div>
                                <div class="video-info">
                                    <p class="video-title">${video.title}</p>
                                    <p class="video-desc">${video.description || ''}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="video-player" id="video-player-${idx}" style="display: none;">
                        <div class="video-container">
                            <iframe id="video-iframe-${idx}" src="" frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen></iframe>
                        </div>
                        <button class="close-video-btn" onclick="closeVideo(${idx})">✕ Đóng video</button>
                    </div>
                </div>
                ` : ''}
                
                <div class="topic-content">
                    <h4>📚 Nội dung lý thuyết</h4>
                    <div class="theory-content">${topic.content}</div>
                </div>

                <div class="topic-goals">
                    <h4>🎯 Mục tiêu học tập</h4>
                    <ul class="goals-list">
                        ${topic.goals.map(goal => `<li>${goal}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="topic-tips">
                    <h4>💡 Mẹo ghi nhớ</h4>
                    <ul>
                        ${topic.tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="topic-practice">
                    <h4>📝 Luyện tập (${totalQuestions} câu)</h4>
                    <div class="practice-actions">
                        ${totalQuestions > 0 ? `
                            <button class="practice-btn" onclick="startTopicPractice(${idx})">
                                🎯 Luyện tập ${totalQuestions} câu hỏi liên quan
                            </button>
                        ` : '<p class="no-questions">Không có câu hỏi liên quan</p>'}
                        ${topic.notebookUrl ? `
                            <a href="${topic.notebookUrl}" target="_blank" class="notebook-btn">
                                📓 Mở NotebookLM
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function findRelatedQuestions(topic) {
    if (!quizData.questions || !topic.questionIds) return [];

    let questions = [];

    // questionIds is an object with chapter keys
    for (const [chapter, ids] of Object.entries(topic.questionIds)) {
        const chapterNum = parseInt(chapter);
        const chapterQuestions = quizData.questions.filter(q =>
            q.chapter === chapterNum && ids.includes(q.question)
        );
        questions = questions.concat(chapterQuestions);
    }

    return questions;
}

function playVideo(videoId, topicIdx, videoIdx) {
    const player = document.getElementById(`video-player-${topicIdx}`);
    const iframe = document.getElementById(`video-iframe-${topicIdx}`);

    if (player && iframe) {
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        player.style.display = 'block';
        player.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function closeVideo(topicIdx) {
    const player = document.getElementById(`video-player-${topicIdx}`);
    const iframe = document.getElementById(`video-iframe-${topicIdx}`);

    if (player && iframe) {
        iframe.src = '';
        player.style.display = 'none';
    }
}

function startTopicPractice(topicIdx) {
    const topic = studyTopics[topicIdx];
    if (!topic) return;

    const relatedQuestions = findRelatedQuestions(topic);
    if (relatedQuestions.length === 0) return;

    // Store questions in sessionStorage and redirect to exam
    sessionStorage.setItem('practiceQuestions', JSON.stringify(relatedQuestions));
    sessionStorage.setItem('practiceTopicName', topic.title);
    window.location.href = 'exam.html?practice=true';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initStudy);
