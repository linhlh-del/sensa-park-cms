import { useState } from 'react';
import { useContent } from '@/lib/content';
import { admin } from '@/lib/supabase';
import { Button, Card, Field, PageHeader, useToast } from '@/components/ui';

/** Cấu hình nơi website gửi lead (Cloudflare Worker) + gửi thử để kiểm tra đường đi Worker → Google Sheet */
export default function LeadSettings() {
  const { get, set, schema } = useContent();
  const toast = useToast();
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const endpoint = get(['lead', 'endpoint']) || '';
  const bad = endpoint && !/^https:\/\/[^\s]+$/.test(endpoint);

  const test = async () => {
    setBusy(true);
    setResult(null);
    try { setResult(await admin('test_lead', { endpoint: endpoint || schema?.lead?.defaultEndpoint })); }
    catch (e) { toast(e.message, 'red'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader
        title="Gửi lead (Worker)"
        description="Form trên website gửi lead tới Cloudflare Worker → Google Sheet (RAW_LEAD) và bảng Lead trong CMS. Đổi endpoint có hiệu lực sau khi Đăng (website build lại)."
      />
      <div className="grid gap-6">
        <Card title="Endpoint">
          <div className="grid gap-4">
            <Field label="URL Worker nhận lead" mono value={endpoint}
              placeholder={schema?.lead?.defaultEndpoint || 'https://<du-an>-lead-worker.<tai-khoan>.workers.dev/lead'}
              hint="Để trống = dùng VITE_LEAD_ENDPOINT đang cấu hình trên Vercel."
              onChange={(v) => set(['lead', 'endpoint'], v.trim() || undefined)} />
            {bad && <p className="text-xs text-red-600">Endpoint phải bắt đầu bằng https://</p>}
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={test} disabled={busy || bad || !(endpoint || schema?.lead?.defaultEndpoint)}>
                {busy ? 'Đang gửi…' : 'Gửi lead thử'}
              </Button>
              <span className="text-xs text-stone-400">Gửi 1 lead tên “TEST CMS”, form_type = cms_test — xoá dòng này trong Sheet sau khi kiểm tra.</span>
            </div>
            {result && (
              <div className={`rounded-lg p-3 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {result.ok ? `Thành công — Worker trả HTTP ${result.status} sau ${result.ms} ms.` : `Thất bại — ${result.error || `HTTP ${result.status}`}`}
                {result.response && <pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(result.response, null, 2)}</pre>}
              </div>
            )}
          </div>
        </Card>

        <Card title="Worker cần cấu hình (một lần, trên Cloudflare)">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-600">
            <li><code>GOOGLE_SHEET_URL</code> — URL Apps Script /exec của Google Sheet (secret).</li>
            <li><code>ALLOWED_ORIGINS</code> — domain website thật (thêm domain mới khi đổi tên miền).</li>
            <li><code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code> (secret) — để lead hiện trong trang Lead của CMS.</li>
            <li><code>PROJECT_ID</code> = <code>{schema?.project || '…'}</code> — khớp dự án trong CMS.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
