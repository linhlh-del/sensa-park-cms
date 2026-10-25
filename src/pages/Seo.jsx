import { useState } from 'react';
import { useContent } from '@/lib/content';
import ImagePicker from '@/components/ImagePicker';
import { Card, Empty, Field, PageHeader, Tabs } from '@/components/ui';
import { PROJECT } from '@/project';

/** Title / description / ảnh chia sẻ của từng trang — kèm bộ đếm theo checklist (title ≤ 60, description 150–160) */
export default function Seo() {
  const { schema, schemaError, get, set } = useContent();
  const langs = schema?.langs || ['vi'];
  const [lang, setLang] = useState(langs[0]);
  if (schemaError) return <Empty>{schemaError}</Empty>;
  if (!schema) return <p className="text-sm text-stone-500">Đang tải…</p>;

  const multi = langs.length > 1;
  const path = (p, field) => (multi ? ['seo', p, lang, field] : ['seo', p, field]);

  return (
    <>
      <PageHeader
        title="SEO từng trang"
        description="Title ≤ 60 ký tự, đặt từ khoá chính trước. Description 150–160 ký tự: có địa danh, số liệu và lời kêu gọi hành động."
        actions={multi && <Tabs value={lang} onChange={setLang} items={langs.map((l) => [l, l.toUpperCase()])} />}
      />
      <div className="flex flex-col gap-6">
        {schema.seo.map((page) => {
          const def = (multi ? page.default?.[lang] : page.default) || {};
          const title = get(path(page.path, 'title')) || '';
          const desc = get(path(page.path, 'description')) || '';
          const url = PROJECT.siteUrl + (lang !== langs[0] ? `/${lang}` : '') + (page.path === '/' ? (lang !== langs[0] ? '' : '/') : page.path);
          return (
            <Card key={page.path} title={`${page.label} — ${page.path}`}>
              <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
                <div className="grid gap-4">
                  <Field label="Title" max={60} placeholder={def.title} value={title} onChange={(v) => set(path(page.path, 'title'), v)} />
                  <Field label="Meta description" multiline rows={3} min={150} max={160} placeholder={def.description} value={desc}
                    onChange={(v) => set(path(page.path, 'description'), v)} />
                </div>
                {/* xem trước kết quả Google */}
                <div className="rounded-lg border border-stone-200 p-4">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-stone-400">Xem trước trên Google</p>
                  <p className="truncate text-xs text-stone-500">{url}</p>
                  <p className="mt-1 line-clamp-2 text-lg leading-snug text-[#1a0dab]">{title || def.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-stone-600">{desc || def.description}</p>
                </div>
              </div>
              {page.ogImage !== false && (
                <div className="mt-5">
                  <ImagePicker
                    spec={{ key: 'og', label: 'Ảnh chia sẻ Facebook / Zalo (og:image)', default: page.defaultOgImage, ratio: '1200×630', hint: 'Để trống = ảnh chia sẻ mặc định của website.' }}
                    value={get(['seo', page.path, 'ogImage'])}
                    onChange={(v) => set(['seo', page.path, 'ogImage'], v)}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
