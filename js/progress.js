// ===== Progress Manager =====
// Handles saving and retrieving learning progress from localStorage

class ProgressManager {
    static get storageKey() { return 'learning_progress_v1'; }

    static getData() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (e) {
            console.error('Error reading progress data:', e);
            return {};
        }
    }

    static saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving progress data:', e);
        }
    }

    /**
     * Save result for a specific study topic
     * @param {string} subjectId 
     * @param {number|string} topicIdx 
     * @param {number} correct 
     * @param {number} total 
     */
    static saveTopicResult(subjectId, topicIdx, correct, total) {
        if (!subjectId || topicIdx === undefined || topicIdx === null || !total) return;

        const score = Math.round((correct / total) * 100);
        const data = this.getData();
        if (!data[subjectId]) data[subjectId] = { topics: {}, chapters: {}, videos: {} };
        if (!data[subjectId].topics) data[subjectId].topics = {};

        const current = data[subjectId].topics[topicIdx] || {
            bestScore: 0,
            attempts: 0,
            totalCorrect: 0,
            totalQuestionCount: 0
        };

        current.lastScore = score;
        current.bestScore = Math.max(current.bestScore || 0, score);
        current.attempts = (current.attempts || 0) + 1;
        current.lastStudied = Date.now();
        current.totalCorrect = (current.totalCorrect || 0) + correct;
        current.totalQuestionCount = (current.totalQuestionCount || 0) + total;

        data[subjectId].topics[topicIdx] = current;
        this.saveData(data);
    }

    static saveChapterResult(subjectId, chapterId, correct, total) {
        if (!subjectId || !chapterId || !total) return;

        const score = Math.round((correct / total) * 100);
        const data = this.getData();
        if (!data[subjectId]) data[subjectId] = { topics: {}, chapters: {}, videos: {} };
        if (!data[subjectId].chapters) data[subjectId].chapters = {};

        const current = data[subjectId].chapters[chapterId] || { bestScore: 0, attempts: 0 };

        current.lastScore = score;
        current.bestScore = Math.max(current.bestScore || 0, score);
        current.attempts = (current.attempts || 0) + 1;
        current.lastStudied = Date.now();
        // Determine if we need cumulative stats for chapters too? Maybe later.

        data[subjectId].chapters[chapterId] = current;
        this.saveData(data);
    }

    static saveVideoResult(subjectId, topicIdx, videoIdx, correct, total) {
        if (!subjectId || topicIdx === null || videoIdx === null || !total) return;

        const score = Math.round((correct / total) * 100);
        const data = this.getData();
        if (!data[subjectId]) data[subjectId] = { topics: {}, chapters: {}, videos: {} };
        if (!data[subjectId].videos) data[subjectId].videos = {};

        const key = `${topicIdx}-${videoIdx}`;
        const current = data[subjectId].videos[key] || {
            bestScore: 0,
            attempts: 0,
            totalCorrect: 0,
            totalQuestionCount: 0
        };

        current.lastScore = score;
        current.bestScore = Math.max(current.bestScore || 0, score);
        current.attempts = (current.attempts || 0) + 1;
        current.lastStudied = Date.now();
        current.totalCorrect = (current.totalCorrect || 0) + correct;
        current.totalQuestionCount = (current.totalQuestionCount || 0) + total;

        data[subjectId].videos[key] = current;
        this.saveData(data);
    }

    static getTopicProgress(subjectId, topicIdx) {
        const data = this.getData();
        return data[subjectId]?.topics?.[topicIdx] || null;
    }

    static getVideoProgress(subjectId, topicIdx, videoIdx) {
        const data = this.getData();
        const key = `${topicIdx}-${videoIdx}`;
        return data[subjectId]?.videos?.[key] || null;
    }

    static getChapterProgress(subjectId, chapterId) {
        const data = this.getData();
        return data[subjectId]?.chapters?.[chapterId] || null;
    }

    /**
     * Get calculated stats for a topic
     */
    static getTopicStats(subjectId, topicIdx, topicData) {
        const data = this.getData();
        const tProg = data[subjectId]?.topics?.[topicIdx];

        // 1. Accuracy (Global for this topic)
        let accuracy = 0;
        if (tProg && tProg.totalQuestionCount > 0) {
            accuracy = Math.round((tProg.totalCorrect / tProg.totalQuestionCount) * 100);
        } else if (tProg && tProg.lastScore !== undefined) {
            // Fallback for old data
            accuracy = tProg.bestScore;
        }

        // 2. Completion
        // If topic has videos, completion = % of videos with at least 1 attempt
        let completion = 0;
        let totalVideos = topicData?.videos?.length || 0;
        let completedVideos = 0;

        if (totalVideos > 0 && data[subjectId]?.videos) {
            for (let i = 0; i < totalVideos; i++) {
                const vKey = `${topicIdx}-${i}`;
                if (data[subjectId].videos[vKey]?.attempts > 0) {
                    completedVideos++;
                }
            }
            completion = Math.round((completedVideos / totalVideos) * 100);
        } else {
            // No videos? Based on topic attempts?
            // If tried at least once, 100%? Or maybe based on score thresholds?
            if (tProg && tProg.attempts > 0) completion = 100;
        }

        return {
            accuracy,
            completion,
            attempts: tProg?.attempts || 0,
            lastScore: tProg?.lastScore || 0
        };
    }

    /**
     * Generate study suggestions based on low scores or unstudied topics
     * @param {string} subjectId 
     * @param {Array} allTopics - List of topic objects from study_data.json
     * @returns {Array} List of suggestions { topic, reason, priority }
     */
    static getSuggestions(subjectId, allTopics) {
        if (!allTopics || !allTopics.length) return [];

        const data = this.getData();
        const subjectProgress = data[subjectId]?.topics || {};
        const videoProgress = data[subjectId]?.videos || {};
        const suggestions = [];

        // Helper to check video status
        const checkVideo = (tIdx, vIdx, vTitle) => {
            const key = `${tIdx}-${vIdx}`;
            const vProg = videoProgress[key];
            if (!vProg) return { status: 'new', score: 0 };
            if (vProg.lastScore < 60) return { status: 'review', score: vProg.lastScore };
            return { status: 'done', score: vProg.lastScore };
        };

        allTopics.forEach((topic, idx) => {
            const progress = subjectProgress[idx];

            // 1. Topic not started
            if (!progress) {
                suggestions.push({
                    type: 'topic',
                    idx: idx,
                    title: topic.title,
                    reason: 'Chưa học chủ đề này',
                    priority: 1,
                    data: null,
                    section: 'start' // used for unique filtering if needed
                });
                // If topic is new, its videos are also new, but let's suggest the Topic first.
                return;
            }

            // 2. Check Videos within Topic
            if (topic.videos && topic.videos.length > 0) {
                topic.videos.forEach((video, vIdx) => {
                    // Skip videos with no questions?
                    // Assuming study.js handles "no questions" by disabling practice, 
                    // but here we might suggest watching it? 
                    // Let's stick to "Practice" context.
                    // If video has questions...

                    const vStatus = checkVideo(idx, vIdx, video.title);

                    if (vStatus.status === 'new') {
                        suggestions.push({
                            type: 'video',
                            idx: idx, // Keep topic idx
                            videoIdx: vIdx,
                            title: `Video: ${video.title}`,
                            reason: 'Chưa làm bài tập video',
                            priority: 2,
                            data: null
                        });
                    } else if (vStatus.status === 'review') {
                        suggestions.push({
                            type: 'video',
                            idx: idx,
                            videoIdx: vIdx,
                            title: `Video: ${video.title}`,
                            reason: `Điểm thấp (${vStatus.score}%)`,
                            priority: 2,
                            data: vStatus
                        });
                    }
                });
            }

            // 3. Topic Review
            if (progress.lastScore < 60) { // Stricter threshold for topic
                suggestions.push({
                    type: 'topic',
                    idx: idx,
                    title: topic.title,
                    reason: `Cần ôn lại (${progress.lastScore}%)`,
                    priority: 3,
                    data: progress
                });
            }

            // 4. Spaced Repetition
            const daysSince = (Date.now() - progress.lastStudied) / (1000 * 60 * 60 * 24);
            if (daysSince > 7) {
                suggestions.push({
                    type: 'topic',
                    idx: idx,
                    title: topic.title,
                    reason: 'Ôn tập định kỳ',
                    priority: 4,
                    data: progress
                });
            }
        });

        // Sort by priority (asc)
        return suggestions.sort((a, b) => a.priority - b.priority);
    }
    static exportData() {
        return JSON.stringify(this.getData(), null, 2);
    }

    static importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            // Basic validation: check if it's an object
            if (typeof data !== 'object' || data === null) {
                throw new Error('Invalid data format');
            }
            // Save to local storage
            this.saveData(data);
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }
}
