# GitHub Actions Workflows

## Manual Deploy to GitHub Pages

Workflow này cho phép triển khai thủ công website lên GitHub Pages.

### Cách sử dụng

1. Truy cập tab **Actions** trong repository
2. Chọn workflow **"Manual Deploy to GitHub Pages"** ở sidebar bên trái
3. Click nút **"Run workflow"** ở góc phải
4. Nhập commit message (tùy chọn, mặc định là "Update site")
5. Click **"Run workflow"** để bắt đầu deployment

### Workflow làm gì?

1. **Checkout repository**: Lấy code từ nhánh hiện tại
2. **Setup Node.js**: Cài đặt Node.js v18
3. **Configure Git**: Cấu hình git user cho GitHub Actions bot
4. **Update version info**: Chạy `update_version.js` để cập nhật thông tin phiên bản
5. **Commit changes**: Commit các thay đổi (bao gồm version.json) vào nhánh main
6. **Deploy to gh-pages**: Merge nhánh main vào gh-pages và push để deploy

### Yêu cầu

- Node.js script `update_version.js` phải tồn tại ở thư mục gốc
- Repository cần có quyền write cho GitHub Actions (mặc định đã có)

### So với deployment scripts cũ

Workflow này thay thế các scripts:
- `deploy.sh` (Linux/Mac)
- `deploy.cmd` (Windows)

Ưu điểm:
- Có thể chạy từ bất kỳ đâu (không cần môi trường local)
- Không cần cài đặt git hoặc Node.js trên máy cá nhân
- Logs deployment được lưu trữ trong GitHub Actions
- Có thể trigger từ GitHub UI hoặc GitHub API
