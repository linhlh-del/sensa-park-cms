import { useContent } from '@/lib/content';
import { Card, Field, PageHeader } from '@/components/ui';

/* Định dạng mã — kiểm tra ngay khi nhập để tránh chèn sai vào toàn site */
const RULES = {
  gtmId: [/^GTM-[A-Z0-9]{4,10}$/, 'GTM-XXXXXXX'],
  ga4Id: [/^G-[A-Z0-9]{4,12}$/, 'G-XXXXXXXXXX'],
  googleAdsId: [/^AW-\d{6,12}$/, 'AW-1234567890'],
  fbPixelId: [/^\d{10,20}$/, 'Chỉ gồm số, 15–16 chữ số'],
  tiktokPixelId: [/^[A-Z0-9]{15,25}$/, 'Mã pixel TikTok (chữ in hoa + số)'],
  googleVerification: [/^[\w-]{20,80}$/, 'Phần content của thẻ google-site-verification'],
  facebookVerification: [/^[a-z0-9]{20,40}$/, 'Phần content của thẻ facebook-domain-verification'],
  zaloVerification: [/^[\w-]{6,80}$/, 'Phần content của thẻ zalo-platform-site-verification'],
  bingVerification: [/^[A-F0-9]{20,40}$/i, 'Phần content của thẻ msvalidate.01'],
};

function Id({ k, label, hint }) {
  const { get, set } = useContent();
  const value = get(['head', k]) || '';
  const [re, example] = RULES[k];
  const bad = value && !re.test(value.trim());
  return (
    <div>
      <Field label={label} value={value} placeholder={example} mono hint={hint}
        onChange={(v) => set(['head', k], v.trim() || undefined)} />
      {bad && <p className="mt-1 text-xs text-red-600">Sai định dạng — ví dụ đúng: {example}</p>}
    </div>
  );
}

export default function Head() {
  const { get, set } = useContent();
  return (
    <>
      <PageHeader
        title="Thẻ head & tracking"
        description="Mã được chèn vào <head> của MỌI trang khi website build lại. Chỉ owner được sửa. Khuyến nghị: cấu hình GA4, Google Ads, Meta Pixel, TikTok bên trong GTM — chỉ nhập GTM ở đây để tránh đếm trùng."
      />
      <div className="grid gap-6">
        <Card title="Google & quảng cáo">
          <div className="grid gap-4 md:grid-cols-2">
            <Id k="gtmId" label="Google Tag Manager — Container ID" hint="Khuyến nghị dùng. Website tải GTM sau khi trang tải xong để không chậm LCP." />
            <Id k="ga4Id" label="Google Analytics 4 — Measurement ID" hint="Chỉ điền nếu KHÔNG cấu hình GA4 trong GTM." />
            <Id k="googleAdsId" label="Google Ads — Conversion ID" hint="Chỉ điền nếu KHÔNG cấu hình Ads trong GTM." />
            <Id k="fbPixelId" label="Meta (Facebook) Pixel ID" hint="Chỉ điền nếu KHÔNG cấu hình Pixel trong GTM." />
            <Id k="tiktokPixelId" label="TikTok Pixel ID" />
          </div>
        </Card>

        <Card title="Xác minh quyền sở hữu website">
          <div className="grid gap-4 md:grid-cols-2">
            <Id k="googleVerification" label="Google Search Console" />
            <Id k="facebookVerification" label="Facebook domain verification" />
            <Id k="zaloVerification" label="Zalo OA / Zalo platform" />
            <Id k="bingVerification" label="Bing Webmaster" />
          </div>
        </Card>

        <Card title="Mã tuỳ chỉnh (nâng cao)">
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            Mã ở đây chạy trên mọi trang với toàn quyền — chỉ dán mã từ nguồn tin cậy (nhà cung cấp chat, heatmap…).
            Mã sai có thể làm hỏng website hoặc làm chậm tốc độ tải. Mỗi lần đăng đều được lưu phiên bản để khôi phục.
          </div>
          <div className="grid gap-4">
            <Field label="Chèn cuối <head>" multiline rows={6} mono value={get(['head', 'customHead'])}
              placeholder="<!-- vd. thẻ meta, <script async src=...></script> -->"
              onChange={(v) => set(['head', 'customHead'], v || undefined)} />
            <Field label="Chèn ngay sau <body> mở" multiline rows={4} mono value={get(['head', 'customBodyStart'])}
              placeholder="<!-- vd. <noscript> của GTM / pixel -->"
              onChange={(v) => set(['head', 'customBodyStart'], v || undefined)} />
          </div>
        </Card>
      </div>
    </>
  );
}
