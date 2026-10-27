import { useCallback, useEffect, useState } from 'react';
import { PROJECT } from '@/project';
import { Badge, Button, Card, fmtDate } from './ui';

/** Mã băm nội dung — khớp hàm contentHash trong scripts/fetch-cms.mjs của website (sha256, 16 ký tự hex) */
export async function contentHash(obj) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(obj ?? {})));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Website đang chạy nội dung nào? Đọc <website>/cms-status.json (website ghi lúc build) và so mã băm với bản đã đăng.
 * Chưa khớp → tự kiểm tra lại mỗi 20 giây (website đang build sau khi bấm Đăng).
 */
export function useSiteStatus(published) {
  const [status, setStatus] = useState(null); // null = đang tải
  const [hash, setHash] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${PROJECT.statusUrl}?t=${Date.now()}`, { cache: 'no-store' });
      setStatus(res.ok ? await res.json() : { missing: true, http: res.status });
    } catch (e) {
      setStatus({ missing: true, error: e.message });
    }
  }, []);

  useEffect(() => { contentHash(published || {}).then(setHash); }, [published]);
  useEffect(() => { load(); }, [load]);

  const match = Boolean(status?.configured && hash && status.content_hash === hash);
  useEffect(() => {
    if (!status || match || status.missing || status.configured === false) return undefined;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [status, match, load]);

  return { status, match, reload: load };
}

/** Thẻ "Nội dung trên website": báo rõ website đã nhận bản đã đăng chưa và vì sao */
export default function SiteStatus({ published, publishedAt }) {
  const { status, match, reload } = useSiteStatus(published);
  const pre = status?.prerender;

  let tone = 'stone';
  let title = 'Đang kiểm tra…';
  let detail = null;
  if (status?.missing) {
    tone = 'amber';
    title = 'Website chưa có file cms-status.json';
    detail = `Website đang chạy bản build cũ (trước khi có báo trạng thái) hoặc chưa push code mới. Đường dẫn: ${PROJECT.statusUrl}`;
  } else if (status?.configured === false) {
    tone = 'red';
    title = 'Website build KHÔNG lấy được nội dung CMS';
    detail = 'Project website trên Vercel thiếu CMS_SUPABASE_URL / CMS_SUPABASE_ANON_KEY (Settings → Environment Variables, tick Production). Thêm biến rồi bấm Đăng lại hoặc Redeploy.';
  } else if (status && match) {
    tone = 'green';
    title = 'Website đang chạy đúng bản đã đăng';
  } else if (status) {
    tone = 'amber';
    title = 'Website đang chạy bản cũ';
    detail = publishedAt && new Date(publishedAt) > new Date(status.built_at)
      ? 'Đang build lại sau lần đăng gần nhất (1–3 phút). Trang tự kiểm tra lại mỗi 20 giây. Quá 10 phút vẫn vậy → xem Build Logs trên Vercel (tìm dòng [cms]).'
      : 'Bản build hiện tại không khớp bản đã đăng. Bấm Đăng lại hoặc Redeploy trên Vercel, rồi xem Build Logs (dòng [cms]).';
  }

  return (
    <Card title="Nội dung trên website" actions={<Button size="sm" variant="ghost" onClick={reload}>Làm mới</Button>}>
      <div className="flex flex-col gap-3 text-sm">
        <div><Badge tone={tone}>{title}</Badge></div>
        {detail && <p className="text-xs leading-relaxed text-stone-600">{detail}</p>}
        {status && !status.missing && (
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-xs text-stone-500">
            <dt>Build lúc</dt><dd>{fmtDate(status.built_at)}{status.commit && ` · commit ${status.commit}`}</dd>
            {status.configured && <><dt>Nội dung CMS</dt><dd>{status.texts} chữ, {status.images} ảnh</dd></>}
            {pre && (
              <>
                <dt>HTML tĩnh (SEO)</dt>
                <dd className={pre.ok ? 'text-emerald-700' : 'font-medium text-red-700'}>
                  {pre.ok ? `${pre.pages}/${pre.total} trang` : `LỖI — ${pre.pages}/${pre.total} trang. ${pre.error || ''}`}
                </dd>
              </>
            )}
          </dl>
        )}
      </div>
    </Card>
  );
}
