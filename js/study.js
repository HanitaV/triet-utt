// ===== Study Page =====

let studyTopics = [];
let topicsContainer, studyTabs;

async function initStudy() {
    await loadAllData();
    await loadStudyData();

    topicsContainer = document.getElementById('topics-container');
    studyTabs = document.querySelectorAll('.study-tab');

    studyTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            studyTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderStudyTopics();
        });
    });

    studyTopics = quizData.studyTopics;
    renderStudyTopics();
}

function renderStudyTopics() {
    const activeTab = document.querySelector('.study-tab.active');
    const chapterFilter = activeTab ? activeTab.dataset.chapter : '1';
    let sections = studyTopics;

    if (chapterFilter !== 'all') {
        sections = sections.filter(s => s.chapter === parseInt(chapterFilter));
    }

    if (!topicsContainer) return;

    if (sections.length === 0) {
        topicsContainer.innerHTML = '<p class="loading-text">Không có nội dung cho chương này.</p>';
        return;
    }

    topicsContainer.innerHTML = sections.map((section, sIdx) => `
        <div class="study-section">
            <h2 class="section-title">${section.sectionTitle}</h2>
            <div class="section-content">
                ${section.topics.map((topic, tIdx) => {
        const relatedQuestions = findRelatedQuestions(topic, section.chapter);
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
                                    <button class="practice-btn" data-section-idx="${sIdx}" data-topic-idx="${tIdx}">
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
    topicsContainer.querySelectorAll('.practice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sIdx = parseInt(e.target.dataset.sectionIdx);
            const tIdx = parseInt(e.target.dataset.topicIdx);
            startTopicPractice(sIdx, tIdx);
        });
    });
}

function findRelatedQuestions(topic, chapter) {
    let questions = quizData.questions;

    if (chapter) {
        questions = questions.filter(q => q.chapter === parseInt(chapter));
    }

    if (topic.questionIds && topic.questionIds.length > 0) {
        return questions.filter(q => topic.questionIds.includes(q.question));
    }

    return questions.filter(q => {
        const questionText = (q.text + ' ' + q.options.map(o => o.text).join(' ')).toLowerCase();
        return topic.keywords.some(keyword => questionText.includes(keyword.toLowerCase()));
    });
}

function startTopicPractice(sIdx, tIdx) {
    const section = studyTopics[sIdx];
    const topic = section?.topics[tIdx];
    if (!topic) return;

    const relatedQuestions = findRelatedQuestions(topic, section.chapter);
    if (relatedQuestions.length === 0) return;

    // Store questions in sessionStorage and redirect to exam
    sessionStorage.setItem('practiceQuestions', JSON.stringify(relatedQuestions));
    window.location.href = 'exam.html?practice=true';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initStudy);
