import { createContext, useCallback, useContext, useState } from 'react';

/* ---------- Bộ component giao diện dùng chung ---------- */

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const v = {
    primary: 'bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-50',
    secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 disabled:opacity-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
    ghost: 'text-stone-600 hover:bg-stone-100',
  }[variant];
  const s = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm';
  return <button type="button" className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ${s} ${v} ${className}`} {...props} />;
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-stone-800">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-stone-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Ô nhập có nhãn, gợi ý, bộ đếm ký tự (min/max) */
export function Field({ label, hint, value = '', onChange, placeholder, multiline, rows = 3, min, max, mono, type = 'text', disabled }) {
  const len = [...String(value || '')].length;
  const shown = len || [...String(placeholder || '')].length;
  const bad = (max && shown > max) || (min && shown && shown < min);
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-medium text-stone-600">
        <span>{label}</span>
        {(min || max) && (
          <span className={bad ? 'text-red-600' : 'text-stone-400'}>
            {shown}{max ? ` / ${min ? `${min}–` : ''}${max}` : ''} ký tự{!len && placeholder ? ' (mặc định)' : ''}
          </span>
        )}
      </span>
      <Tag
        type={multiline ? undefined : type}
        rows={multiline ? rows : undefined}
        value={value || ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[var(--accent)] focus:outline-none disabled:bg-stone-50 ${mono ? 'font-mono text-xs' : ''} ${multiline ? 'resize-y' : 'h-10'}`}
      />
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

export function Badge({ tone = 'stone', children }) {
  const t = {
    stone: 'bg-stone-100 text-stone-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700', blue: 'bg-sky-50 text-sky-700',
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${t}`}>{children}</span>;
}

export function Empty({ children }) {
  return <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">{children}</p>;
}

export function Tabs({ value, onChange, items }) {
  return (
    <div className="inline-flex rounded-lg bg-stone-100 p-1">
      {items.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)}
          className={`h-8 rounded-md px-3 text-xs font-medium ${value === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Thông báo nổi ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, tone = 'green') => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), tone === 'red' ? 8000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${i.tone === 'red' ? 'bg-red-600' : i.tone === 'blue' ? 'bg-sky-700' : 'bg-emerald-700'}`}>
            {i.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const fmtNum = (n) => Number(n || 0).toLocaleString('vi-VN');
