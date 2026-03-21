const fs = require('fs');
const { spawn } = require('child_process');

const VERSION_FILE = 'version.json';

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

// Get git commit hash using spawn (full path, no shell)
const git = spawn('C:\\Program Files\\Git\\cmd\\git.exe', ['rev-parse', '--short', 'HEAD']);
let commitHash = '';

git.stdout.on('data', (data) => {
    commitHash += data.toString().trim();
});

git.on('close', () => {
    versionData.commit = commitHash || 'unknown';
    versionData.date = new Date().toLocaleString('vi-VN');
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 4));
    console.log(`Updated version.json: v${versionData.version} - ${versionData.commit}`);
});
