# Power of AI Agents — WebGIS AI Orchestrator

Mô phỏng trực quan **58 AI Agent** phối hợp thực hiện bài toán **WebGIS ngập đô thị và đề xuất sơ tán**, trên GitHub Pages.

Trang dự kiến: https://xulytiengviet.github.io/xyflow/ (sau khi GitHub Pages được bật và xuất bản).

**LƯU Ý:** Đây là mô phỏng trình diễn chạy trong trình duyệt, không phải 58 mô hình AI vận hành thật, không có backend điều phối, không có dữ liệu trạm thời gian thực hay dự báo thiên tai. Không dùng để đưa ra quyết định sơ tán.

## Các tệp

- **docs/index.html** — dashboard WebGIS trắng–đen.
- **docs/styles.css** — giao diện responsive, trạng thái, bản đồ và lưới đồ thị.
- **docs/app.js** — 58 Agent minh họa, luồng kết nối, hoạt cảnh con trỏ, bản đồ SVG, tìm kiếm, chạy lại và xuất JSON.
- **index.html** — chuyển hướng đến thư mục docs trong trường hợp Pages triển khai từ root.

Các thư viện React Flow và Svelte Flow gốc trong thư mục packages được giữ nguyên.

## Phân bổ 58 Agent

| Nhóm | Agent | Mô tả |
| --- | ---: | --- |
| Planning | 7 | Lập kế hoạch |
| Spatial ETL | 7 | Chuẩn hóa dữ liệu không gian |
| Sensor Fusion | 6 | Đồng bộ cảm biến |
| Vision | 5 | Diễn giải ảnh |
| Hydrology | 8 | Phân tích kịch bản ngập |
| Risk Scoring | 7 | Đánh giá nguy cơ |
| Routing | 7 | Đề xuất tuyến đi |
| Reporting | 6 | Xuất báo cáo |
| QA | 5 | Kiểm định |
| **Tổng** | **58** | |

Chỉ số **58 agents | 1847 layers** dùng trong trình diễn. 1847 layers là **1.847 thao tác/lớp UI tổng hợp**, **không phải 1.847 lớp dữ liệu GIS**. Các polygon, tọa độ, trạm và tuyến trong bản đồ đều là dữ liệu mô phỏng, không được kiểm chứng.

## Điều khiển

- **Tạm dừng / Tiếp tục, Chạy lại, 1× / 2× / 4×**.
- Bật tắt sáu loại lớp GIS; phóng to, thu nhỏ và khôi phục bản đồ.
- Tìm kiếm A01–A58 hoặc nhóm; nhấn nút Agent để xem mô tả và trạng thái.
- Nhấn vùng nguy cơ để xem dữ liệu mẫu.
- Theo dõi log, tiến trình các nhóm và trạng thái Agent.
- **Nhật ký JSON** xuất cấu trúc hoạt động giả lập, có cờ synthetic: true.

## Chạy tại máy

Có thể mở trực tiếp file **docs/index.html** bằng trình duyệt hiện đại hoặc chạy máy chủ HTTP tĩnh từ thư mục gốc:

    python -m http.server 8080

Truy cập http://localhost:8080/docs/

## Cấu hình GitHub Pages

Vào **Settings → Pages → Build and deployment**, chọn **Source: Deploy from a branch**, chọn **Branch main**, chọn thư mục **/docs**, rồi lưu. Khi xuất bản xong, URL là https://xulytiengviet.github.io/xyflow/

Nếu chọn **/(root)**, file index ở root sẽ điều hướng sang đường dẫn /xyflow/docs/.

Chú ý: commit lên repository không chứng minh website Pages đã bật hoặc đã chạy thành công. Kiểm tra status tại GitHub Pages và Actions.

## Giới hạn và hướng tích hợp thực

Bản website **hiện dùng DOM/SVG thuần**, tham khảo cách trực quan hóa đồ thị của React Flow/xyflow nhưng không nhúng thư viện @xyflow/react. Mô phỏng tiếp nối ý tưởng **wireframe → nhiều con trỏ → render** từ file HTML người dùng cung cấp và bổ sung đồ thị, dữ liệu SVG, tương tác và nhật ký.

Để sử dụng AI Agent thật: sử dụng @xyflow/react cho canvas node-based; MapLibre/Leaflet cho GIS, PostGIS/GDAL cho phép tính; backend gửi sự kiện đã xác thực qua WebSocket/SSE. Không được coi 58 agent giả lập là benchmark thực tế.

## Ghi nhận

- React Flow / Svelte Flow: https://github.com/xyflow/xyflow (MIT).
- React Flow Examples: https://reactflow.dev/examples
- Mã HTML tham khảo do người dùng cung cấp: deepseek_html_20261104_e83103.html
- Triển khai và thiết kế mô phỏng: **Long Ngo**; tham chiếu giấy phép MIT ở LICENSE của repository.
- Dự án này là mô phỏng độc lập trên fork, không phải một sản phẩm chính thức của nhóm xyflow.
