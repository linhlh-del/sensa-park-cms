import { useEffect, useRef, useState } from 'react';
import { listImages, siteImage, uploadImage } from '@/lib/image';
import { Button, useToast } from './ui';

/**
 * Chọn ảnh cho 1 vị trí: tải ảnh mới (tự nén WebP) hoặc chọn từ thư viện; nhập alt (bắt buộc cho SEO).
 * value: { src, alt } | undefined (undefined = dùng ảnh mặc định của website)
 * alt / onAlt: khi website khai báo altKey, alt được lưu thành chữ (texts[altKey]) thay vì trong value.alt
 */
export default function ImagePicker({ spec, value, onChange, altDefault, alt, onAlt }) {
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState(null);
  const current = value?.src || siteImage(spec.default);
  const overridden = Boolean(value?.src);

  const onFile = async (file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast('Ảnh lớn hơn 25 MB.', 'red'); return; }
    setBusy(true);
    try {
      const up = await uploadImage(file);
      onChange({ ...(value || {}), src: up.src, width: up.width, height: up.height });
      toast(`Đã tải ảnh (${Math.round(up.size / 1024)} KB WebP). Nhớ Lưu nháp.`);
    } catch (e) {
      toast(e.message, 'red');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-800">{spec.label}</p>
          {spec.hint && <p className="text-xs text-stone-400">{spec.hint}</p>}
        </div>
        {overridden && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Đã thay</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="aspect-[4/3] overflow-hidden rounded-lg border border-stone-200 bg-[repeating-conic-gradient(#f5f5f4_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
          {current ? <img src={current} alt="" className="h-full w-full object-contain" /> : null}
        </div>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-stone-600">Mô tả ảnh (alt) — chứa từ khoá, mô tả đúng nội dung ảnh</span>
            <input
              value={(onAlt ? alt : value?.alt) || ''}
              placeholder={altDefault || 'vd. Phối cảnh hồ bơi tràn bờ dự án'}
              onChange={(e) => (onAlt ? onAlt(e.target.value) : onChange({ ...(value || {}), alt: e.target.value || undefined }))}
              className="h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Đang nén & tải…' : 'Tải ảnh mới'}</Button>
            <Button size="sm" variant="secondary" onClick={() => setLibrary(library ? null : 'open')}>Chọn từ thư viện</Button>
            {overridden && <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>Dùng ảnh mặc định</Button>}
          </div>
          {spec.ratio && <p className="text-xs text-stone-400">Tỉ lệ khuyến nghị {spec.ratio}. Ảnh được nén WebP, cạnh dài tối đa 2400px.</p>}
        </div>
      </div>

      {library && <Library onPick={(src) => { onChange({ ...(value || {}), src }); setLibrary(null); }} />}
    </div>
  );
}

function Library({ onPick }) {
  const [items, setItems] = useState(null);
  useEffect(() => { listImages().then(setItems).catch(() => setItems([])); }, []);
  if (!items) return <p className="mt-4 text-sm text-stone-500">Đang tải thư viện…</p>;
  if (!items.length) return <p className="mt-4 text-sm text-stone-500">Thư viện trống — hãy tải ảnh mới.</p>;
  return (
    <div className="mt-4 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
      {items.map((i) => (
        <button key={i.path} type="button" onClick={() => onPick(i.src)} title={i.name}
          className="aspect-square overflow-hidden rounded-md border border-stone-200 hover:ring-2 hover:ring-[var(--accent)]">
          <img src={i.src} alt="" loading="lazy" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}
