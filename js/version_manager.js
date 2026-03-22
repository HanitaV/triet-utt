const VersionManager = {
    changelogData: null,
    versionData: null,

    async init() {
        try {
            // Load both files in parallel
            const [changelogRes, versionRes] = await Promise.all([
                fetch('changelog.json?v=' + Date.now()),
                fetch('version.json?v=' + Date.now())
            ]);

            if (changelogRes.ok) this.changelogData = await changelogRes.json();
            if (versionRes.ok) this.versionData = await versionRes.json();

            // Auto-detect page and render
            this.renderHome();
            this.renderSettings();
            this.renderFooterVersion();

        } catch (error) {
            console.error('Error initializing version manager:', error);
        }
    },

    renderHome() {
        // 1. Render Hero Version (optional, if element exists)
        const heroVersion = document.getElementById('hero-version');
        if (heroVersion && this.versionData) {
            // heroVersion.textContent = `v${this.versionData.version}`;
        }

        // 2. Render Home Banner
        const bannerContainer = document.querySelector('.update-banner .md-container > div');
        if (bannerContainer && this.changelogData?.releases?.length) {
            const latest = this.changelogData.releases[0];
            const releaseTitle = latest.title || 'Cap nhat moi nhat';
            const features = Array.isArray(latest.features) ? latest.features.slice(0, 3) : [];

            bannerContainer.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, var(--md-tertiary-container), var(--md-surface-container-high));
                    border-radius: 16px;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                    box-shadow: var(--md-shadow-2);
                    border: 1px solid var(--md-outline-variant);
                ">
                    <div style="
                        background: var(--md-primary);
                        color: var(--md-on-primary);
                        padding: 6px 14px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        white-space: nowrap;
                    ">
                        🚀 v${latest.version}
                    </div>
                    <div style="flex: 1; min-width: 220px;">
                        <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: var(--md-on-surface);">
                            ${releaseTitle}
                        </div>
                        <div style="font-size: 13px; color: var(--md-on-surface-variant); display: flex; gap: 10px; flex-wrap: wrap;">
                            ${features.map(f => {
                                const text = f.replace(/<[^>]*>/g, '').trim();
                                return `<span>${text}</span>`;
                            }).join('')}
                        </div>
                    </div>
                    <a href="settings.html" style="
                        background: var(--md-primary);
                        color: var(--md-on-primary);
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: 500;
                        text-decoration: none;
                        white-space: nowrap;
                        transition: transform 0.2s, box-shadow 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        Xem changelog →
                    </a>
                </div>
            `;
        }
    },

    renderSettings() {
        // Render Changelog List
        const container = document.querySelector('.changelog-list');
        if (container && this.changelogData?.releases?.length) {
            container.innerHTML = this.changelogData.releases.map((release, index) => `
                <div class="changelog-item"
                    style="padding: 16px; background: ${index === 0 ? 'var(--md-surface-container-high)' : 'var(--md-surface-container)'}; border-radius: 12px; ${index === 0 ? 'border-left: 4px solid var(--md-primary);' : ''}">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-weight: 600; ${index === 0 ? 'color: var(--md-primary);' : ''}">v${release.version}</span>
                        <span style="font-size: 12px; opacity: 0.6;">${release.date}</span>
                        ${release.isNew ? `<span style="background: var(--md-primary); color: var(--md-on-primary); font-size: 10px; padding: 2px 8px; border-radius: 12px;">MỚI</span>` : ''}
                    </div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: var(--md-on-surface-variant);">
                        ${release.features.map(f => `<li>${this.formatFeature(f)}</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        }
    },

    renderFooterVersion() {
        const els = document.querySelectorAll('.footer-version');
        if (this.versionData && els.length) {
            // Extract just the date part if it contains time (e.g. "18:57:45 13/1/2026")
            let dateDisplay = this.versionData.date;
            if (dateDisplay.includes(' ')) {
                dateDisplay = dateDisplay.split(' ')[1]; // 13/1/2026
            }

            els.forEach(el => {
                el.innerHTML = `
                    <span>v${this.versionData.version}</span> •
                    <span>#${this.versionData.commit}</span> •
                    <span>Updated: ${dateDisplay}</span>
                `;
            });
        }
    },

    formatFeature(text) {
        // If text starts with emoji+space, preserve it.
        // Bold the part before ' - '
        if (text.includes(' - ')) {
            const parts = text.split(' - ');
            const title = parts[0];
            const desc = parts.slice(1).join(' - ');
            return `<strong>${title}</strong> - ${desc}`;
        }
        return text;
    },

    getFeatureIcon(text) {
        // Simple heuristic to adding icon if missing (though json should have them)
        if (text.match(/^[\u{1F300}-\u{1F9FF}]/u)) return ''; // Already has emoji
        return '🔹';
    }
};

document.addEventListener('DOMContentLoaded', () => VersionManager.init());
