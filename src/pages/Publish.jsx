import { useCallback, useEffect, useState } from 'react';
import { useContent, diffKeys } from '@/lib/content';
import { admin, supabase } from '@/lib/supabase';
import { PROJECT } from '@/project';
import { Badge, Button, Card, Empty, Field, PageHeader, fmtDate, useToast } from '@/components/ui';
import SiteStatus from '@/components/SiteStatus';

const STATE = { READY: ['Đã lên website', 'green'], BUILDING: ['Đang build', 'amber'], QUEUED: ['Đang chờ build', 'amber'], INITIALIZING: ['Đang khởi tạo', 'amber'], ERROR: ['Build lỗi', 'red'], CANCELED: ['Đã huỷ', 'stone'] };

/** Đăng bản nháp lên website (Supabase → Vercel Deploy Hook → build lại) + lịch sử phiên bản để khôi phục */
export default function Publish() {
  const { row, dirty, reload } = useContent();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState(null);
  const [deploy, setDeploy] = useState(null);

  const loadVersions = useCallback(async () => {
    const { data } = await supabase.from('cms_versions').select('id, note, created_by, created_at')
      .eq('project_id', PROJECT.id).order('created_at', { ascending: false }).limit(30);
    setVersions(data || []);
  }, []);
  const loadDeploy = useCallback(() => admin('deploy_status').then(setDeploy).catch(() => setDeploy(null)), []);

  useEffect(() => { loadVersions(); loadDeploy(); }, [loadVersions, loadDeploy]);
  /* đang build → hỏi lại mỗi 10 giây */
  useEffect(() => {
    if (!deploy?.state || ['READY', 'ERROR', 'CANCELED'].includes(deploy.state)) return undefined;
    const t = setInterval(loadDeploy, 10000);
    return () => clearInterval(t);
  }, [deploy, loadDeploy]);

  const changes = row ? diffKeys(row.published, row.draft) : [];

  const run = async (action, payload, okText) => {
    setBusy(true);
    try {
      const r = await admin(action, payload);
      await reload();
      await loadVersions();
      toast(r.deploy?.triggered ? okText : `Đã lưu nhưng chưa build lại website: ${r.deploy?.reason}`, r.deploy?.triggered ? 'green' : 'red');
      setTimeout(loadDeploy, 3000);
      setNote('');
    } catch (e) {
      toast(e.message, 'red');
    } finally {
      setBusy(false);
    }
  };

  const publish = () => run('publish', { note }, 'Đã đăng — website đang build lại, khoảng 1–3 phút.');
  const rollback = (v) => {
    if (!window.confirm(`Khôi phục phiên bản #${v.id} (${fmtDate(v.created_at)})? Bản nháp hiện tại sẽ bị thay thế.`)) return;
    run('rollback', { version_id: v.id }, `Đã khôi phục phiên bản #${v.id} — website đang build lại.`);
  };

  const st = deploy?.state && STATE[deploy.state];
  return (
    <>
      <PageHeader title="Đăng & lịch sử" description="Đăng = lưu bản nháp thành bản chính thức và build lại website (giữ nguyên HTML tĩnh chuẩn SEO). Mỗi lần đăng tạo một phiên bản để khôi phục." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title="Đăng bản nháp">
          {dirty && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Còn thay đổi chưa lưu nháp — hãy Lưu nháp trước, phần chưa lưu sẽ không được đăng.</p>}
          {changes.length ? (
            <>
              <p className="mb-2 text-sm text-stone-600">{changes.length} thay đổi so với bản đang chạy trên website:</p>
              <ul className="mb-4 max-h-56 overflow-y-auto rounded-lg bg-stone-50 p-3 font-mono text-xs text-stone-600">
                {changes.map((k) => <li key={k}>{k}</li>)}
              </ul>
            </>
          ) : <p className="mb-4 text-sm text-stone-500">Bản nháp đã giống bản đang chạy.</p>}
          <Field label="Ghi chú phiên bản (tuỳ chọn)" value={note} onChange={setNote} placeholder="vd. Cập nhật chính sách bán hàng tháng 11" />
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={publish} disabled={busy || dirty || !changes.length}>{busy ? 'Đang đăng…' : 'Đăng lên website'}</Button>
            {row?.published_at && <span className="text-xs text-stone-400">Lần đăng gần nhất: {fmtDate(row.published_at)} bởi {row.published_by}</span>}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
        <SiteStatus published={row?.published} publishedAt={row?.published_at} />
        <Card title="Build trên Vercel" actions={<Button size="sm" variant="ghost" onClick={loadDeploy}>Làm mới</Button>}>
          {!deploy ? <p className="text-sm text-stone-500">Đang kiểm tra…</p> : !deploy.configured ? (
            <p className="text-sm text-stone-500">Chưa cấu hình VERCEL_TOKEN cho Edge Function nên không xem được trạng thái build. Website vẫn build lại bình thường qua Deploy Hook.</p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {st ? <Badge tone={st[1]}>{st[0]}</Badge> : <span>{deploy.state || deploy.error}</span>}
              {deploy.created && <span className="text-xs text-stone-500">Bắt đầu: {fmtDate(deploy.created)}</span>}
              {deploy.url && <a href={deploy.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline">Xem bản deploy ↗</a>}
            </div>
          )}
        </Card>
        </div>
      </div>

      <Card title="Lịch sử phiên bản" className="mt-6">
        {!versions ? <p className="text-sm text-stone-500">Đang tải…</p> : !versions.length ? <Empty>Chưa có lần đăng nào.</Empty> : (
          <ul className="divide-y divide-stone-100">
            {versions.map((v, i) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-800">#{v.id} {i === 0 && <Badge tone="green">Mới nhất</Badge>} {v.note && <span className="font-normal text-stone-600">— {v.note}</span>}</p>
                  <p className="text-xs text-stone-400">{fmtDate(v.created_at)} · {v.created_by}</p>
                </div>
                {i > 0 && <Button size="sm" variant="secondary" disabled={busy} onClick={() => rollback(v)}>Khôi phục</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
