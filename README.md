# BẾP GỌN AI – Smart Food, Smart Living 🍱🤖

> **Ứng dụng F&B tích hợp Trí tuệ Nhân tạo toàn diện trong Chuỗi Cung ứng & Quản trị**
> Đề tài bài tập môn: **Quản trị học** (Bài 4: Chức năng Hoạch định / Lập kế hoạch - 30% học phần)
> Trường: **Đại học Nam Cần Thơ (DNC)**

---

## 🌟 Tổng Quan Dự Án
Web App **Bếp Gọn AI** được xây dựng nhằm giải quyết bài toán cốt lõi của ngành F&B sinh viên: **"Trưa nay ăn gì?"** (về phía khách hàng) và **"Nấu bao nhiêu suất, đi chợ mua bao nhiêu kg nguyên liệu để không bị ế và thiu hỏng?"** (về phía chủ kinh doanh / nhà quản trị).

Hệ thống tích hợp đầy đủ **6 giải pháp AI hoạt động thực tế 100%**:
1. **AI Đề xuất Thực đơn Cá nhân hóa**: Lọc theo ngân sách (25k-60k), mục tiêu calo (tăng cơ, giảm cân, cân bằng), chế độ ăn chay/mặn, tự động tránh thành phần dị ứng, thiết kế thực đơn 7 ngày.
2. **AI Dự báo Nhu cầu & Tính Định lượng Nguyên liệu Đi Chợ (BOM - Bill of Materials)**: Dự báo suất ăn dựa trên thời tiết Cần Thơ (nắng/mưa/nóng) và sự kiện trường DNC (mùa thi, hội thảo, nghỉ lễ); tự động quy đổi ra số kg thịt gà, thịt heo, cá basa, rau củ, gạo ST25 cần mua.
3. **AI Trợ lý Đặt món 24/7 (NLP Conversational Assistant)**: Khách nhắn tin tự nhiên tiếng Việt, AI tự bóc tách ý định, gợi ý món hợp lý và thêm trực tiếp vào giỏ hàng.
4. **AI Giám sát Kho & Cảnh báo Hạn dùng FIFO (First-In, First-Out)**: Quản lý tồn kho theo thời gian thực, cảnh báo nguyên liệu cận date 1 ngày để kích hoạt xả hàng.
5. **AI Dynamic Pricing (Định giá linh hoạt)**: Tự động giảm giá 15% cho các món sử dụng nguyên liệu cận date hoặc tạo flash sale xế chiều nhằm triệt tiêu lãng phí thực phẩm.
6. **AI Phân tích Cảm xúc & Thấu cảm Khách hàng (Sentiment Analysis)**: Quét nhận xét, phân loại Tích cực / Trung tính / Cần cải thiện, trích xuất từ khóa và đưa ra khuyến nghị quản trị.

---

## 🚀 Cách Khởi Chạy
Ứng dụng đang được bật sẵn trên máy của bạn tại cổng `3000`:
* Truy cập trực tiếp: [http://localhost:3000](http://localhost:3000)

Nếu cần khởi động lại thủ công trong tương lai:
```bash
cd /home/loctm/.gemini/antigravity/scratch/bep-gon-ai
npm start
```

---

## ⚡ 3 Kịch Bản Live Demo Phục Vụ Thuyết Trình 15 Phút Trên Lớp
Ở góc trên cùng của giao diện, có thanh công cụ **⚡ Chạy thử 3 Kịch bản Demo 15 phút**:
1. **🎯 Demo 1: Khách hàng AI cá nhân hóa (2 phút)**: 1-click kích hoạt gợi ý bữa trưa 35.000đ không ăn cay, tạo bảng thực đơn tuần và thêm vào giỏ.
2. **📈 Demo 2: Dự báo suất ăn & Đi chợ tự động (3 phút)**: 1-click mô phỏng ngày mai trời mưa + mùa thi DNC, AI dự báo 95 suất và tự động tính bảng số kg thịt, cá, gạo cần đi chợ.
3. **🛡️ Demo 3: Hoạch định rủi ro Quản trị học (2.5 phút)**: 1-click mô phỏng What-If khi doanh số giảm 20% và giá thịt tăng 15%, tự động tính điểm hòa vốn (BEP) và kích hoạt kế hoạch dự phòng.

---

## 📁 Cấu Trúc Mã Nguồn
* [server.js](file:///home/loctm/.gemini/antigravity/scratch/bep-gon-ai/server.js): Backend API Express tích hợp thuật toán của 6 hệ thống AI & mô phỏng tài chính.
* [public/index.html](file:///home/loctm/.gemini/antigravity/scratch/bep-gon-ai/public/index.html): Giao diện 2 chế độ (Khách hàng & Chủ bếp), đồ thị Chart.js và hiệu ứng Confetti.
* [public/js/app.js](file:///home/loctm/.gemini/antigravity/scratch/bep-gon-ai/public/js/app.js): Xử lý tương tác, giỏ hàng, kịch bản demo và kết nối API.
* [data/](file:///home/loctm/.gemini/antigravity/scratch/bep-gon-ai/data): Dữ liệu thực đơn, tồn kho nguyên liệu, đơn hàng và đánh giá khách hàng.

