# MinIO File Editor Integration - Summary Report

## 🎯 Mục Tiêu
Tích hợp MinIO storage từ dự án Wonderpedia vào giao diện DeepTutor để cho phép đội ngũ nội dung xem, tìm kiếm và chỉnh sửa trực tiếp các bài viết (Markdown/JSON) lưu trữ trên S3.

## 🚀 Kết Quả Thực Hiện

### 1. Backend & MinIO Integration
*   **Kết nối:** Thiết lập thành công kết nối giữa Backend DeepTutor và MinIO container của Wonderpedia (bucket `wonderpedia-data`).
*   **Service Layer (`src/services/storage/minio_client.py`):**
    *   Xây dựng `MinIOService` class xử lý các thao tác S3 raw.
    *   Xử lý đặc thù của MinIO directory (kích thước `0`, không có `last_modified`) để tránh lỗi 500 khi API list files.
*   **API Router (`src/api/routers/minio_files.py`):**
    *   Triển khai đầy đủ các endpoints: `list_buckets`, `list_files` (hỗ trợ đệ quy/lọc), `get_file`, `save_file`.

### 2. Frontend - File Browser (`/files`)
*   **Giao diện quản lý file:**
    *   Dropdown chọn Bucket.
    *   Thanh tìm kiếm (Search) lọc file realtime.
*   **Tính năng nâng cao:**
    *   **Duyệt thư mục đa cấp (Recursive Navigation):** Cho phép người dùng đi sâu vào các thư mục con (ví dụ: `wonderpedia/nha-trang`) thay vì chỉ liệt kê phẳng.
    *   **Breadcrumbs:** Thanh điều hướng đường dẫn để dễ dàng quay lại thư mục cha.
    *   **Bộ lọc file:** Hiển thị cả file `.md`, `.markdown` và `.json`.

### 3. Frontend - Smart Editor (`/files/edit`)
*   **Markup Editor:** Tái sử dụng component `CoWriterEditor` để soạn thảo Markdown trực quan.
*   **JSON Smart Edit:**
    *   Tự động phát hiện file `.json`.
    *   **Tách nội dung:** Tự động tìm và trích xuất trường nội dung bài viết (ví dụ: `content`, `body`, `markdown`) ra giao diện soạn thảo.
    *   **Lưu thông minh:** Khi lưu, hệ thống tự động ghép nội dung đã sửa trở lại cấu trúc JSON gốc, đảm bảo không làm mất hoặc sai lệch các trường dữ liệu meta khác (title, images, url...).
*   **Trải nghiệm người dùng:**
    *   Phím tắt `Ctrl+S` để lưu nhanh.
    *   Cảnh báo "Unsaved changes" khi định thoát trang mà chưa lưu.
