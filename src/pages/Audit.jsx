import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PROJECT } from '@/project';
import { Card, Empty, PageHeader, fmtDate } from '@/components/ui';

/** Ai đã làm gì, khi nào (lưu nháp, đăng, khôi phục, xuất lead, đổi thành viên…) */
export default function Audit() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from('cms_audit_log').select('*').eq('project_id', PROJECT.id).order('ts', { ascending: false }).limit(200)
      .then(({ data }) => setRows(data || []));
  }, []);
  return (
    <>
      <PageHeader title="Nhật ký" description="200 thao tác gần nhất." />
      <Card>
        {!rows ? <p className="text-sm text-stone-500">Đang tải…</p> : !rows.length ? <Empty>Chưa có thao tác.</Empty> : (
          <ul className="divide-y divide-stone-100 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-1 py-2.5 md:grid-cols-[150px_220px_160px_1fr]">
                <span className="text-stone-500">{fmtDate(r.ts)}</span>
                <span className="truncate">{r.actor}</span>
                <span className="font-mono text-xs text-stone-700">{r.action}</span>
                <span className="truncate font-mono text-xs text-stone-400" title={JSON.stringify(r.detail)}>{r.detail ? JSON.stringify(r.detail) : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
