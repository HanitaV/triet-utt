// ===== Dashboard Page =====

async function initDashboard() {
    // Ensure subject config is loaded first
    await loadSubjectsList();
    await loadCurrentSubjectConfig();

    updateHomeContent();

    await loadAllData();
    updateDashboard();
}

function updateHomeContent() {
    if (!currentSubjectData) return;

    // Update Meta and Title
    document.title = `Ôn Thi ${currentSubjectData.name} | ${currentSubjectData.shortSchool}`;
    const metaDesc = document.getElementById('meta-desc');
    if (metaDesc) {
        metaDesc.content = `Ứng dụng ôn thi trắc nghiệm ${currentSubjectData.name} - ${currentSubjectData.school} - Học tập cùng AI.`;
    }

    // Update Hero Section
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = `Chinh phục ${currentSubjectData.name}`;

    // Note: Logo is also updated in common.js updateHeaderWithSubject(), but we can do it here too for redundancy or specific home styling
    const logo = document.getElementById('header-logo');
    if (logo) logo.innerHTML = `${currentSubjectData.icon} ${currentSubjectData.name}`;

    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        heroSubtitle.textContent = `Nền tảng ôn thi ${currentSubjectData.name} toàn diện với sự hỗ trợ của AI`;
    }

    // Update Stats
    const heroTopicCount = document.getElementById('hero-topic-count');
    if (heroTopicCount && currentSubjectData.chapters) {
        heroTopicCount.textContent = currentSubjectData.chapters.length;
    }

    // Update Feature Descriptions
    const examFeatureDesc = document.getElementById('exam-feature-desc');
    if (examFeatureDesc) {
        examFeatureDesc.textContent = `Kho ngân hàng câu hỏi phong phú chia theo ${currentSubjectData.chapters?.length || 0} chương. Chế độ luyện tập, xem giải thích chi tiết và gợi ý từ AI.`;
    }

    const studyFeatureDesc = document.getElementById('study-feature-desc');
    if (studyFeatureDesc) {
        // Can customized if needed
        studyFeatureDesc.textContent = `Hệ thống bài giảng video, lý thuyết tóm tắt và câu hỏi ôn tập theo ${currentSubjectData.chapters?.length || 0} chủ đề với sự hỗ trợ của NotebookLM.`;
    }

    // Update Footer
    const footerSchoolInfo = document.getElementById('footer-school-info');
    if (footerSchoolInfo) {
        footerSchoolInfo.innerHTML = `Ôn tập miễn phí do sinh viên trường Đại học Công nghệ Giao thông vận tải tạo và Học viện Công nghệ Bưu chính Viễn thông hỗ trợ nội dung ❤️`;
    }
}

function updateDashboard() {
    // Update chapter counts
    const totalQuestions = document.getElementById('total-questions');
    const studiedToday = document.getElementById('studied-today');
    const accuracyRate = document.getElementById('accuracy-rate');

    if (totalQuestions) totalQuestions.textContent = quizData.questions.length;

    const stats = getStats();
    if (studiedToday) studiedToday.textContent = stats.studiedToday;

    const accuracy = stats.totalAnswered > 0
        ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
        : 0;
    if (accuracyRate) accuracyRate.textContent = `${accuracy}%`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initDashboard);
