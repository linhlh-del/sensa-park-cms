import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, audit } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PROJECT } from '@/project';
import { Badge, Button, Card, Empty, PageHeader, fmtDate, useToast } from '@/components/ui';

export const STATUSES = [
  ['new', 'Mới', 'blue'], ['contacted', 'Đã liên hệ', 'amber'], ['qualified', 'Tiềm năng', 'green'],
  ['visited', 'Đã tham quan', 'green'], ['won', 'Chốt', 'green'], ['lost', 'Không mua', 'stone'], ['spam', 'Spam', 'red'],
];
const label = Object.fromEntries(STATUSES.map(([k, l, t]) => [k, [l, t]]));
const PAGE = 50;

/** Danh sách lead (từ Worker → Supabase): lọc, đổi trạng thái, gán người phụ trách, ghi chú, xuất CSV. Lead mới hiện realtime. */
export default function Leads() {
  const { email } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [days, setDays] = useState(30);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    let query = supabase.from('cms_leads').select('*').eq('project_id', PROJECT.id)
      .gte('created_at', new Date(Date.now() - days * 864e5).toISOString())
      .order('created_at', { ascending: false }).limit(1000);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) toast(error.message, 'red');
    setRows(data || []);
  }, [status, days, toast]);

  useEffect(() => { load(); }, [load]);

  /* lead mới → thêm lên đầu bảng + thông báo */
  useEffect(() => {
    const ch = supabase.channel(`leads-${PROJECT.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cms_leads', filter: `project_id=eq.${PROJECT.id}` }, (p) => {
        setRows((r) => [p.new, ...(r || [])]);
        toast(`Lead mới: ${p.new.name} — ${p.new.phone}`, 'blue');
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [toast]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows || []).filter((r) => !s || [r.name, r.phone, r.email, r.utm_campaign, r.note].some((v) => v?.toLowerCase().includes(s)));
  }, [rows, q]);

  const update = async (row, patch) => {
    const { error } = await supabase.from('cms_leads').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', row.id);
    if (error) { toast(error.message, 'red'); return; }
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, ...patch } : x)));
    audit('lead.update', { id: row.id, ...patch }, email);
  };

  const exportCsv = () => {
    const cols = ['created_at', 'name', 'phone', 'email', 'apartment_type', 'status', 'assigned_to', 'note', 'form_type', 'channel', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer', 'page_url'];
    /* chặn công thức Excel/Sheets (=, +, -, @) */
    const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    const csv = '﻿' + [cols.join(','), ...filtered.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `lead-${PROJECT.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    audit('leads.export', { count: filtered.length }, email);
  };

  return (
    <>
      <PageHeader
        title="Lead"
        description="Lead gửi từ form website (qua Worker). Google Sheet vẫn là bản lưu song song."
        actions={<Button variant="secondary" onClick={exportCsv} disabled={!filtered.length}>Xuất CSV ({filtered.length})</Button>}
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên, SĐT, chiến dịch…"
            className="h-9 w-64 rounded-lg border border-stone-300 px-3 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-stone-300 px-2 text-sm">
            <option value="">Mọi trạng thái</option>
            {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-lg border border-stone-300 px-2 text-sm">
            {[[1, 'Hôm nay'], [7, '7 ngày'], [30, '30 ngày'], [90, '90 ngày'], [365, '12 tháng']].map(([d, l]) => <option key={d} value={d}>{l}</option>)}
          </select>
        </div>

        {!rows ? <p className="text-sm text-stone-500">Đang tải…</p> : !filtered.length ? <Empty>Chưa có lead.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-stone-400">
                <tr>{['Thời gian', 'Khách hàng', 'Nhu cầu', 'Nguồn', 'Trạng thái', 'Phụ trách', ''].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-stone-500">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-stone-900">{r.name}</p>
                      <a href={`tel:${r.phone}`} className="text-[var(--accent)]">{r.phone}</a>
                      {r.email && <p className="text-xs text-stone-500">{r.email}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-stone-600">{r.apartment_type || '—'}<p className="text-xs text-stone-400">{r.form_type}</p></td>
                    <td className="px-3 py-2.5 text-xs text-stone-600">
                      {r.channel || '—'}{r.utm_source && ` · ${r.utm_source}`}{r.utm_campaign && <p className="text-stone-400">{r.utm_campaign}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <select value={r.status} onChange={(e) => update(r, { status: e.target.value })}
                        className="h-8 rounded-md border border-stone-200 bg-white px-1.5 text-xs">
                        {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                      <div className="mt-1"><Badge tone={label[r.status]?.[1]}>{label[r.status]?.[0]}</Badge></div>
                    </td>
                    <td className="px-3 py-2.5">
                      <input defaultValue={r.assigned_to || ''} placeholder="email sale" onBlur={(e) => e.target.value !== (r.assigned_to || '') && update(r, { assigned_to: e.target.value || null })}
                        className="h-8 w-40 rounded-md border border-stone-200 px-2 text-xs" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>Ghi chú</Button>
                      {open === r.id && (
                        <textarea defaultValue={r.note || ''} rows={3} autoFocus onBlur={(e) => e.target.value !== (r.note || '') && update(r, { note: e.target.value || null })}
                          className="mt-1 block w-56 rounded-md border border-stone-200 p-2 text-xs" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
