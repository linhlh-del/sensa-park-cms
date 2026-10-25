import { useContent } from '@/lib/content';
import { Badge, Button, Card, Empty, PageHeader } from '@/components/ui';

/**
 * Bố cục trang chủ (giới hạn có chủ đích): bật/tắt, đổi thứ tự và chọn biến thể có sẵn của từng section.
 * Không kéo thả tự do để giữ thiết kế, thứ tự heading SEO và hiệu năng (CLS) của website.
 * Section "locked" (vd. Hero, form đăng ký) luôn hiển thị và giữ vị trí.
 */
export default function Layout() {
  const { schema, schemaError, get, set } = useContent();
  if (schemaError) return <Empty>{schemaError}</Empty>;
  if (!schema) return <p className="text-sm text-stone-500">Đang tải…</p>;

  const all = schema.sections.filter((s) => s.inLayout !== false);
  const byId = Object.fromEntries(all.map((s) => [s.id, s]));
  const saved = get(['layout', 'order']) || [];
  /* thứ tự = thứ tự đã lưu (bỏ id không còn tồn tại) + section mới thêm vào cuối theo mặc định */
  const order = [...saved.filter((id) => byId[id]), ...all.map((s) => s.id).filter((id) => !saved.includes(id))];
  const hidden = new Set(get(['layout', 'hidden']) || []);
  const variants = get(['layout', 'variants']) || {};

  const setOrder = (next) => set(['layout', 'order'], next.join() === all.map((s) => s.id).join() ? undefined : next);
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= order.length || byId[order[i]].locked || byId[order[j]].locked) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  const toggle = (id) => {
    const next = new Set(hidden);
    next.has(id) ? next.delete(id) : next.add(id);
    set(['layout', 'hidden'], next.size ? [...next] : undefined);
  };
  const setVariant = (s, v) => {
    const next = { ...variants, [s.id]: v };
    if (v === s.variants[0].id) delete next[s.id];
    set(['layout', 'variants'], Object.keys(next).length ? next : undefined);
  };

  return (
    <>
      <PageHeader
        title="Bố cục section"
        description="Bật/tắt, đổi thứ tự và chọn kiểu hiển thị có sẵn cho các section trang chủ. Section ẩn vẫn giữ nội dung để bật lại bất cứ lúc nào."
        actions={<Button variant="secondary" onClick={() => { set(['layout'], undefined); }}>Về bố cục mặc định</Button>}
      />
      <Card>
        <ol className="flex flex-col divide-y divide-stone-100">
          {order.map((id, i) => {
            const s = byId[id];
            const off = hidden.has(id);
            return (
              <li key={id} className={`flex flex-wrap items-center gap-4 py-3 ${off ? 'opacity-50' : ''}`}>
                <span className="w-6 text-right text-xs tabular-nums text-stone-400">{i + 1}</span>
                <div className="flex flex-col">
                  <button type="button" aria-label="Lên" disabled={s.locked || i === 0} onClick={() => move(i, -1)}
                    className="h-5 text-stone-400 hover:text-stone-900 disabled:opacity-25">▲</button>
                  <button type="button" aria-label="Xuống" disabled={s.locked || i === order.length - 1} onClick={() => move(i, 1)}
                    className="h-5 text-stone-400 hover:text-stone-900 disabled:opacity-25">▼</button>
                </div>
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-medium text-stone-800">{s.label}</p>
                  <p className="text-xs text-stone-400">#{s.id}</p>
                </div>
                {s.locked && <Badge>Cố định</Badge>}
                {s.variants?.length > 1 && (
                  <select value={variants[s.id] || s.variants[0].id} onChange={(e) => setVariant(s, e.target.value)}
                    className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm">
                    {s.variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                )}
                <label className={`flex items-center gap-2 text-sm ${s.locked || s.hideable === false ? 'opacity-40' : ''}`}>
                  <input type="checkbox" checked={!off} disabled={s.locked || s.hideable === false} onChange={() => toggle(id)} className="size-4 accent-[var(--accent)]" />
                  Hiển thị
                </label>
              </li>
            );
          })}
        </ol>
      </Card>
    </>
  );
}
