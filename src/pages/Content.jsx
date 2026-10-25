import { useEffect, useState } from 'react';
import { useContent, defaultOf, textOf, withLang } from '@/lib/content';
import ImagePicker from '@/components/ImagePicker';
import { Card, Empty, Field, PageHeader, Tabs } from '@/components/ui';

/** Sửa chữ + ảnh của từng section theo schema website cung cấp */
export default function Content() {
  const { schema, schemaError, get, set } = useContent();
  const [active, setActive] = useState(null);
  const langs = schema?.langs || ['vi'];
  const [lang, setLang] = useState(langs[0]);
  useEffect(() => { if (schema && !active) setActive(schema.sections[0]?.id); }, [schema, active]);

  if (schemaError) return <Empty>{schemaError}</Empty>;
  if (!schema) return <p className="text-sm text-stone-500">Đang tải cấu trúc website…</p>;

  const section = schema.sections.find((s) => s.id === active);
  const texts = get(['texts']) || {};
  const images = get(['images']) || {};
  const edited = (s) => [...(s.fields || []).map((f) => texts[f.key]), ...(s.images || []).map((i) => images[i.key])].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Nội dung & ảnh"
        description="Để trống một ô = website dùng nội dung mặc định (hiện ở dạng chữ mờ). Thay đổi chỉ lên website sau khi Lưu nháp và Đăng."
        actions={langs.length > 1 && <Tabs value={lang} onChange={setLang} items={langs.map((l) => [l, l === 'vi' ? 'Tiếng Việt' : 'English'])} />}
      />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex flex-col gap-0.5 self-start rounded-xl border border-stone-200 bg-white p-2 lg:sticky lg:top-6">
          {schema.sections.map((s) => (
            <button key={s.id} type="button" onClick={() => setActive(s.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${s.id === active ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}>
              <span className="truncate">{s.label}</span>
              {edited(s) > 0 && <span className="ml-2 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{edited(s)}</span>}
            </button>
          ))}
        </nav>

        {section && (
          <div className="flex min-w-0 flex-col gap-6">
            {section.description && <p className="text-sm text-stone-500">{section.description}</p>}
            {section.fields?.length > 0 && (
              <Card title="Chữ">
                <div className="grid gap-4">
                  {section.fields.map((f) => {
                    if (f.langs && !f.langs.includes(lang)) return null;
                    const raw = texts[f.key];
                    return (
                      <Field
                        key={f.key}
                        label={f.label}
                        hint={f.hint}
                        multiline={f.type === 'textarea'}
                        rows={f.rows || 3}
                        max={f.maxLength}
                        min={f.minLength}
                        placeholder={defaultOf(f, lang)}
                        value={textOf(raw, lang, langs)}
                        onChange={(v) => set(['texts', f.key], withLang(raw, lang, langs, v))}
                      />
                    );
                  })}
                </div>
              </Card>
            )}
            {section.images?.length > 0 && (
              <Card title="Ảnh">
                <div className="grid gap-4">
                  {section.images.map((spec) => (
                    <ImagePicker key={spec.key} spec={spec} value={images[spec.key]} altDefault={spec.altDefault}
                      onChange={(v) => set(['images', spec.key], v)}
                      {...(spec.altKey ? {
                        alt: textOf(texts[spec.altKey], lang, langs),
                        onAlt: (v) => set(['texts', spec.altKey], withLang(texts[spec.altKey], lang, langs, v)),
                      } : {})} />
                  ))}
                </div>
              </Card>
            )}
            {!section.fields?.length && !section.images?.length && <Empty>Section này không có trường sửa được.</Empty>}
          </div>
        )}
      </div>
    </>
  );
}
