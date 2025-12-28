const fs = require('fs');
const { exec } = require('child_process');

const VERSION_FILE = 'version.json';

// Get current version data or default
let versionData = {
    version: '1.2.0',
    commit: 'unknown',
    date: new Date().toLocaleDateString('vi-VN')
};

try {
    if (fs.existsSync(VERSION_FILE)) {
        versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
} catch (e) {
    console.error('Error reading version file:', e);
}

// Get latest git commit hash (short)
exec('git rev-parse --short HEAD', (err, stdout, stderr) => {
    if (err) {
        console.error('Error getting git commit:', err);
        return;
    }

    const commitHash = stdout.trim();

    // Update data
    versionData.commit = commitHash;
    versionData.date = new Date().toLocaleString('vi-VN');

    // Write back to file
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 4));
    console.log(`Updated version.json: v${versionData.version} - ${commitHash}`);
});
