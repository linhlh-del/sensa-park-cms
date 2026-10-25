import { useCallback, useEffect, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/lib/supabase';
import { PROJECT } from '@/project';
import { Card, Empty, PageHeader, Tabs, fmtNum } from '@/components/ui';

const RANGES = [['1', 'Hôm nay'], ['7', '7 ngày'], ['30', '30 ngày'], ['90', '90 ngày']];
const CHANNEL = { direct: 'Trực tiếp', organic: 'Tìm kiếm tự nhiên', paid: 'Quảng cáo', social: 'Mạng xã hội', referral: 'Website khác', email: 'Email', zalo: 'Zalo' };
const DEVICE = { mobile: 'Điện thoại', tablet: 'Máy tính bảng', desktop: 'Máy tính', unknown: 'Không rõ' };
const EVENT = { pageview: 'xem trang', section_view: 'xem section', cta_click: 'bấm', form_start: 'bắt đầu điền form', lead: 'GỬI LEAD', leave: 'rời trang' };

/** bắt đầu khoảng thời gian theo giờ Việt Nam */
function since(days) {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 36e5);
  vn.setUTCHours(0, 0, 0, 0);
  return new Date(vn.getTime() - 7 * 36e5 - (Number(days) - 1) * 864e5).toISOString();
}

/** Dashboard: khách đang online (realtime) + nguồn truy cập, hành vi, chuyển đổi theo khoảng thời gian */
export default function Dashboard() {
  const [range, setRange] = useState('7');
  const [sum, setSum] = useState(null);
  const [live, setLive] = useState(null);
  const [feed, setFeed] = useState([]);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('cms_analytics_summary', { p: PROJECT.id, since: since(range) });
    if (e) setError(e.message); else { setSum(data); setError(''); }
  }, [range]);
  const loadLive = useCallback(async () => {
    const { data } = await supabase.rpc('cms_analytics_live', { p: PROJECT.id });
    if (data) setLive(data);
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 15000);
    return () => clearInterval(t);
  }, [loadLive]);

  /* luồng sự kiện realtime (bỏ heartbeat cho dễ đọc) */
  const liveTimer = useRef(0);
  useEffect(() => {
    const ch = supabase.channel(`events-${PROJECT.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cms_events', filter: `project_id=eq.${PROJECT.id}` }, (p) => {
        if (p.new.type !== 'heartbeat') setFeed((f) => [p.new, ...f].slice(0, 30));
        /* gộp nhiều event liên tiếp thành 1 lần tải lại số online */
        clearTimeout(liveTimer.current);
        liveTimer.current = setTimeout(loadLive, 1500);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); clearTimeout(liveTimer.current); };
  }, [loadLive]);

  const conv = sum?.sessions ? ((sum.leads / sum.sessions) * 100).toFixed(1) : '0';

  return (
    <>
      <PageHeader title="Dashboard" description="Số liệu từ tracker riêng của website (không phụ thuộc GA4). Khách “online” = có hoạt động trong 2 phút gần nhất."
        actions={<Tabs value={range} onChange={setRange} items={RANGES} />} />
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Đang online" value={live?.online} live />
        <Kpi label="Khách truy cập" value={sum?.visitors} />
        <Kpi label="Phiên" value={sum?.sessions} />
        <Kpi label="Lượt xem trang" value={sum?.pageviews} />
        <Kpi label="Lead" value={sum?.leads} />
        <Kpi label="Tỉ lệ chuyển đổi" value={`${conv}%`} raw />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card title="Khách truy cập theo ngày">
          {sum?.by_day?.length ? (
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={sum.by_day} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="visitors" name="Khách" stroke={PROJECT.accent} fill={PROJECT.accent} fillOpacity={0.15} />
                  <Area type="monotone" dataKey="pageviews" name="Lượt xem" stroke="#a8a29e" fill="#a8a29e" fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>Chưa có dữ liệu trong khoảng này.</Empty>}
        </Card>

        <Card title={`Đang online (${live?.online ?? 0})`}>
          {!live?.sessions?.length ? <Empty>Hiện không có khách nào.</Empty> : (
            <ul className="flex max-h-64 flex-col divide-y divide-stone-100 overflow-y-auto text-sm">
              {live.sessions.map((s) => (
                <li key={s.session_id} className="py-2">
                  <p className="truncate font-medium text-stone-800">{s.path}</p>
                  <p className="text-xs text-stone-500">{CHANNEL[s.channel] || s.channel} · {s.source} · {DEVICE[s.device] || s.device || '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Bars title="Kênh truy cập" rows={sum?.by_channel} map={CHANNEL} />
        <Bars title="Nguồn (utm_source / website giới thiệu)" rows={sum?.by_source} />
        <Bars title="Chiến dịch (utm_campaign)" rows={sum?.by_campaign} />
        <Bars title="Thiết bị" rows={sum?.by_device} map={DEVICE} />
        <Bars title="Trang được xem nhiều" rows={sum?.top_paths} />
        <Bars title="Nút được bấm (CTA)" rows={sum?.top_ctas} />
        <Bars title="Section khách đã xem tới" rows={sum?.sections} />
      </div>

      <Card title="Hoạt động realtime">
        {!feed.length ? <Empty>Đang chờ hoạt động mới…</Empty> : (
          <ul className="divide-y divide-stone-100 text-sm">
            {feed.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3 py-1.5">
                <span className="w-20 text-stone-400">{new Date(e.ts).toLocaleTimeString('vi-VN')}</span>
                <span className={e.type === 'lead' ? 'font-semibold text-emerald-700' : 'text-stone-700'}>{EVENT[e.type] || e.type}{e.label && ` · ${e.label}`}</span>
                <span className="text-stone-500">{e.path}</span>
                <span className="text-xs text-stone-400">{CHANNEL[e.channel] || e.channel}{e.utm_source && ` · ${e.utm_source}`}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Kpi({ label, value, live, raw }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="flex items-center gap-2 text-xs text-stone-500">
        {live && <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{value == null ? '—' : raw ? value : fmtNum(value)}</p>
    </div>
  );
}

function Bars({ title, rows, map = {} }) {
  const max = Math.max(1, ...(rows || []).map((r) => r.n));
  return (
    <Card title={title}>
      {!rows?.length ? <p className="text-sm text-stone-400">Chưa có dữ liệu.</p> : (
        <ul className="flex flex-col gap-2 text-sm">
          {rows.slice(0, 10).map((r) => (
            <li key={r.key ?? '∅'}>
              <div className="flex justify-between gap-3"><span className="truncate text-stone-700">{map[r.key] || r.key || '(không có)'}</span><span className="tabular-nums text-stone-500">{fmtNum(r.n)}</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-stone-100"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(r.n / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
