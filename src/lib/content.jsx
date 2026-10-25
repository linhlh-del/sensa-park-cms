import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO, supabase, audit } from './supabase';
import { useAuth } from './auth';
import { PROJECT } from '@/project';

/*
 * Cấu trúc nội dung (draft / published) — website đọc lúc build:
 * {
 *   texts:    { "<key>": "chuỗi" | { vi, en } },
 *   images:   { "<key>": { src, alt? } },
 *   layout:   { order: [sectionId], hidden: [sectionId], variants: { sectionId: variantId } },
 *   seo:      { "<path>": { title?, description?, ogImage? } | { vi: {...}, en: {...} } },
 *   head:     { gtmId, ga4Id, googleAdsId, fbPixelId, tiktokPixelId, googleVerification, facebookVerification,
 *               zaloVerification, bingVerification, customHead, customBodyStart },
 *   settings: { "<key>": "giá trị" },
 *   lead:     { endpoint }
 * }
 * Khoá không có trong draft → website dùng giá trị mặc định trong code (schema.default).
 */

const Ctx = createContext(null);
export const useContent = () => useContext(Ctx);

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/** Đọc / ghi theo đường dẫn mảng: get(obj, ['texts', 'hero.title']) */
export function getIn(obj, path) {
  return path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setIn(obj, path, value) {
  const next = { ...obj };
  let cur = next;
  path.slice(0, -1).forEach((k) => { cur[k] = { ...(cur[k] || {}) }; cur = cur[k]; });
  const last = path[path.length - 1];
  if (value === undefined || value === '' || value === null) delete cur[last];
  else cur[last] = value;
  return next;
}

/** Danh sách khoá khác nhau giữa 2 bản (để xem trước khi đăng) */
export function diffKeys(a = {}, b = {}) {
  const out = [];
  for (const group of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[group] || {}, y = b[group] || {};
    if (typeof x !== 'object' || typeof y !== 'object' || Array.isArray(x)) {
      if (JSON.stringify(x) !== JSON.stringify(y)) out.push(group);
      continue;
    }
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) out.push(`${group}.${k}`);
    }
  }
  return out;
}

export function ContentProvider({ children }) {
  const { email } = useAuth();
  const [row, setRow] = useState(null);       // bản trên server
  const [draft, setDraft] = useState(null);   // bản đang sửa (chưa lưu)
  const [schema, setSchema] = useState(null);
  const [schemaError, setSchemaError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (DEMO) {
      const data = JSON.parse(localStorage.getItem('cms-demo') || 'null') || { draft: {}, published: {} };
      setRow(data);
      setDraft(clone(data.draft || {}));
      return data;
    }
    const { data, error } = await supabase.from('cms_content')
      .select('draft, draft_updated_at, draft_updated_by, published, published_at, published_by')
      .eq('project_id', PROJECT.id).single();
    if (error) throw error;
    setRow(data);
    setDraft(clone(data.draft || {}));
    return data;
  }, []);

  useEffect(() => {
    load().catch(() => setRow({ error: true }));
    fetch(PROJECT.schemaUrl, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSchema)
      .catch((e) => setSchemaError(`Không tải được schema từ ${PROJECT.schemaUrl} (${e.message}). Website cần build bản có CMS trước.`));
  }, [load]);

  const dirty = useMemo(
    () => Boolean(row && draft && JSON.stringify(row.draft || {}) !== JSON.stringify(draft)),
    [row, draft],
  );

  /* cảnh báo khi đóng tab còn thay đổi chưa lưu */
  useEffect(() => {
    if (!dirty) return undefined;
    const fn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [dirty]);

  const set = useCallback((path, value) => setDraft((d) => setIn(d || {}, path, value)), []);
  const get = useCallback((path) => getIn(draft, path), [draft]);

  /* Lưu nháp có kiểm tra xung đột: chỉ ghi nếu không ai lưu chen giữa */
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (DEMO) {
        const next = { ...row, draft: clone(draft), draft_updated_at: now, draft_updated_by: email };
        localStorage.setItem('cms-demo', JSON.stringify(next));
        setRow(next);
        return;
      }
      let q = supabase.from('cms_content')
        .update({ draft, draft_updated_at: now, draft_updated_by: email })
        .eq('project_id', PROJECT.id);
      q = row.draft_updated_at ? q.eq('draft_updated_at', row.draft_updated_at) : q.is('draft_updated_at', null);
      const { data, error } = await q.select('draft_updated_at');
      if (error) throw error;
      if (!data?.length) {
        throw new Error('Bản nháp vừa được người khác lưu. Hãy tải lại trang để lấy bản mới nhất (thay đổi của bạn chưa được lưu).');
      }
      await audit('content.save', { keys: diffKeys(row.draft, draft).slice(0, 50) }, email);
      setRow((r) => ({ ...r, draft: clone(draft), draft_updated_at: now, draft_updated_by: email }));
    } finally {
      setSaving(false);
    }
  }, [draft, row, email]);

  const discard = useCallback(() => setDraft(clone(row?.draft || {})), [row]);

  const value = { row, draft, schema, schemaError, dirty, saving, get, set, save, discard, reload: load };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Giá trị mặc định của 1 trường theo ngôn ngữ (schema.default có thể là chuỗi hoặc {vi,en}) */
export const defaultOf = (field, lang) =>
  field?.default && typeof field.default === 'object' ? field.default[lang] ?? '' : field?.default ?? '';

/** Giá trị override trong draft theo ngôn ngữ */
export function textOf(value, lang, langs) {
  if (value == null) return '';
  if (typeof value === 'string') return langs.length > 1 && lang !== langs[0] ? '' : value;
  return value[lang] ?? '';
}

/** Ghi override theo ngôn ngữ, gộp lại thành chuỗi nếu site chỉ 1 ngôn ngữ */
export function withLang(value, lang, langs, next) {
  if (langs.length === 1) return next;
  const obj = typeof value === 'string' ? { [langs[0]]: value } : { ...(value || {}) };
  if (next === '' || next == null) delete obj[lang]; else obj[lang] = next;
  return Object.keys(obj).length ? obj : undefined;
}
