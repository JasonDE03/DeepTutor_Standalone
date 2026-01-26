# MinIO Version Control & Diff Viewer - Setup Guide

## ✅ Đã Hoàn Thành

### 1. Backend - MinIO Versioning Support
- ✅ **MinIO Bucket Versioning Enabled** (bucket: `wonderpedia-data`)
- ✅ **Backend API hoàn chỉnh:**
  - `MinIOService.list_file_versions()` - Liệt kê tất cả versions
  - `MinIOService.get_file_version()` - Lấy nội dung của version cụ thể
  - `GET /api/v1/files/{bucket}/{path}/versions` - List versions endpoint
  - `GET /api/v1/files/{bucket}/{path}/versions/{version_id}` - Get version endpoint

### 2. Frontend - Diff Viewer UI
- ✅ **Component `DiffViewerModal.tsx`** mới:
  - Modal popup hiển thị side-by-side diff
  - Dropdown chọn version để compare
  - Auto-select version trước đó (previous version)
  - Format ngày giờ theo kiểu Việt Nam
  - Hiển thị size file
- ✅ **Tích hợp vào Editor:**
  - Button "Compare Versions" trong header
  - Mở modal khi click
  - Pass current content để compare

### 3. Dependencies
- ✅ Added `react-diff-viewer-continued@^3.4.0` to `package.json`

## 🔧 Cài Đặt & Chạy

### Bước 1: Install Frontend Dependencies
```bash
cd /home/sonnpn/VSF/DeepTutor_Standalone/frontend
npm install
# Hoặc nếu dùng Docker:
docker compose run --rm frontend npm install
```

### Bước 2: Kiểm tra MinIO đang chạy
```bash
docker ps | grep minio
# Nếu chưa chạy:
cd /home/sonnpn/VSF/wonderpedia/wonderpedia_airflow
docker compose up -d minio
```

### Bước 3: Khởi động DeepTutor
```bash
cd /home/ sonnpn/VSF/DeepTutor_Standalone
docker compose up -d
```

##🎯 Cách Sử Dụng

1. **Truy cập File Editor:**
   - Mở http://localhost:3000/files
   - Chọn file để edit (ví dụ: `wonderpedia/nha-trang/1-ngay-o-nha-trang.json`)

2. **So sánh Versions:**
   - Click button **"Compare Versions"** (icon GitCompare) trên header
   - Modal popup sẽ hiển thị
   - Chọn version cũ từ dropdown
   - Xem diff side-by-side (màu đỏ = deleted, màu xanh = added)

3. **Restore Version (từ MinIO Console):**
   - Nếu muốn restore về version cũ, dùng MinIO Console (http://localhost:9003)
   - Navigate tới file → Versions tab → Click "Restore this version"

## 📊 Workflow Version Control

```
User edit file → Click Save → MinIO tự động tạo version mới
                                ↓
                          Version 1, 2, 3, 4...
                                ↓
      Click "Compare Versions" → Xem diff với version bất kỳ
```

## 🧪 Test Cases

### Test 1: Xem File Versions
```bash
# URL test
http://localhost:8001/api/v1/files/wonderpedia-data/wonderpedia/nha-trang/1-ngay-o-nha-trang.json/versions

# Expected: JSON array of versions with version_id, timestamp, size
```

### Test 2: Get Specific Version
```bash
# URL test (thay {version_id} bằng ID thực tế từ Test 1)
http://localhost:8001/api/v1/files/wonderpedia-data/wonderpedia/nha-trang/1-ngay-o-nha-trang.json/versions/{version_id}

# Expected: Content of that specific version
```

### Test 3: Diff Viewer UI
1. Edit file và Save vài lần để tạo nhiều versions
2. Click "Compare Versions"
3. Chọn version cũ → Verify diff hiển thị đúng

## 🐛 Troubleshooting

### Lỗi: "Cannot find module react-diff-viewer-continued"
```bash
cd /home/sonnpn/VSF/DeepTutor_Standalone/frontend
npm install react-diff-viewer-continued
```

### Lỗi: MinIO API 500 Error
- Kiểm tra MinIO container: `docker logs airflow_minio`
- Verify versioning enabled: `/tmp/mc version info myminio/wonderpedia-data`

### Lỗi: No versions found
- File chưa có version nào (chưa Save lần 2)
- Versioning bật sau khi file đã tồn tại (chỉ áp dụng cho các thay đổi mới)

## 📝 Notes

- TypeScript linting errors sẽ biến mất sau khi `npm install` (node_modules chưa có)
- Diff viewer hoạt động tốt nhất với file text (Markdown, JSON)
- Để tiết kiệm storage, có thể set lifecycle policy cho MinIO (chỉ giữ N versions gần nhất)
