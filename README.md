# CMS

Trang quản trị cho landing page. Hai CMS (`norton-park-cms`, `sensa-park-cms`) dùng chung toàn bộ code,
chỉ khác `src/project.js`. Backend và hướng dẫn cài đặt: [`../cms-supabase/README.md`](../cms-supabase/README.md).

## Chức năng
| Trang | Nội dung |
|---|---|
| Dashboard | Khách đang online (realtime), khách / phiên / lượt xem / lead / tỉ lệ chuyển đổi, theo ngày, kênh, nguồn, chiến dịch, thiết bị, trang, CTA, section |
| Nội dung & ảnh | Sửa chữ từng section (vi/en nếu website song ngữ), thay ảnh (tự nén WebP), alt ảnh |
| Bố cục section | Bật/tắt, đổi thứ tự, chọn biến thể có sẵn (vd. ảnh trái/phải) |
| SEO từng trang | Title / description có bộ đếm ký tự, ảnh chia sẻ, xem trước kết quả Google |
| Thông tin chung | Hotline, Zalo, địa chỉ… dùng toàn site |
| Thẻ head & tracking | GTM, GA4, Google Ads, Meta Pixel, TikTok, mã xác minh, mã tuỳ chỉnh (chỉ owner) |
| Lead | Lead realtime, trạng thái, người phụ trách, ghi chú, xuất CSV |
| Gửi lead (Worker) | Endpoint Worker + gửi lead thử |
| Đăng & lịch sử | Xem thay đổi, đăng (website build lại 1–3 phút), trạng thái build, khôi phục phiên bản |
| Thành viên / Nhật ký | Whitelist email Google + vai trò, lịch sử thao tác |

## Cấu trúc nội dung lấy từ website
CMS không tự định nghĩa section: website xuất `/cms-schema.json` lúc build (`src/cms/schema.js` trong repo website)
gồm section, trường, ảnh, giá trị mặc định và biến thể. Thêm trường mới → sửa schema bên website, CMS tự hiện.

## Chạy
```bash
npm install
cp .env.example .env.local   # điền VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5180 (sensa: 5181)
npm run build                # deploy thư mục dist lên Vercel (vercel.json đã có rewrite SPA)
```
