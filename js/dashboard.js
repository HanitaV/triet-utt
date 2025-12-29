// ===== Dashboard Page =====

async function initDashboard() {
    // Ensure subject config is loaded first
    await loadSubjectsList();
    await loadCurrentSubjectConfig();

    updateHomeContent();

    await loadAllData();
    await updateSuggestions();
    updateDashboard();
}

async function updateSuggestions() {
    // Ensure study data is loaded
    const studyTopics = await loadStudyData();
    const subjectId = getCurrentSubjectId();

    // Get suggestions from ProgressManager
    const suggestions = ProgressManager.getSuggestions(subjectId, studyTopics);

    // Render
    const container = document.getElementById('suggestions-section');
    const list = document.getElementById('suggestion-list');

    if (!container || !list) return;

    if (suggestions.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    // Take top 3 suggestions
    list.innerHTML = suggestions.slice(0, 3).map(s => {
        let badgeClass = 'priority-badge';

        // Build URL
        let url = `study.html?topic=${s.idx}`;
        if (s.type === 'video') {
            url += `&video=${s.videoIdx}`;
        }

        const actionText = s.type === 'video' ? 'Xem video &rarr;' : 'Học ngay &rarr;';

        return `
        <div class="suggestion-item" onclick="window.location.href='${url}'">
            <div class="suggestion-info">
                <div class="suggestion-title">${s.title}</div>
                <div class="suggestion-reason">
                   <span class="${badgeClass}">${s.reason}</span>
                </div>
            </div>
            <div class="suggestion-action">${actionText}</div>
        </div>
    `}).join('');
}

function updateHomeContent() {
    if (!currentSubjectData) return;

    // Title and meta are now set in HTML for NEO Education branding
    // No longer dynamically overwriting page title

    // Update Hero Section with current subject
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = `Chinh phục ${currentSubjectData.name}`;

    // Header logo now displays NEO Education logo only - no longer overwriting
    // Logo HTML is set in the HTML files with theme-aware image switching

    const heroSubtitle = document.querySelector('.md-hero-subtitle');
    if (heroSubtitle) {
        heroSubtitle.textContent = `Nền tảng ôn thi ${currentSubjectData.name} với sự hỗ trợ của AI`;
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

    // Update Version Badge
    const heroVersion = document.getElementById('hero-version');
    if (heroVersion) {
        fetch(`version.json?v=${Date.now()}`)
            .then(res => res.json())
            .then(data => {
                heroVersion.innerHTML = `
                    <span>v${data.version}</span>
                    <span style="opacity:0.5">|</span>
                    <span>Commit: ${data.commit}</span>
                    <span style="opacity:0.5">|</span>
                    <span>${data.date}</span>
                `;
            })
            .catch(err => {
                console.warn('Failed to load version info', err);
                heroVersion.style.display = 'none';
            });
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

// Data Management Functions
window.exportData = function () {
    const dataStr = ProgressManager.exportData();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    // Create download link
    const exportFileDefaultName = `onthi_backup_${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
};

window.importData = function (input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        if (ProgressManager.importData(content)) {
            alert('✅ Khôi phục dữ liệu thành công! Trang sẽ được tải lại.');
            location.reload();
        } else {
            alert('❌ Khôi phục thất bại. File không hợp lệ.');
        }
    };
    reader.readAsText(file);

    // Reset input
    input.value = '';
};
