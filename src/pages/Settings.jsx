import { useContent, defaultOf } from '@/lib/content';
import { Card, Empty, Field, PageHeader } from '@/components/ui';

/** Thông tin dùng chung toàn site: hotline, Zalo, email, địa chỉ… (khoá do website khai báo trong schema.settings) */
export default function Settings() {
  const { schema, schemaError, get, set } = useContent();
  if (schemaError) return <Empty>{schemaError}</Empty>;
  if (!schema) return <p className="text-sm text-stone-500">Đang tải…</p>;
  return (
    <>
      <PageHeader title="Thông tin chung" description="Áp dụng cho header, footer, nút gọi/Zalo, form và schema JSON-LD. Địa chỉ phải ghi theo đơn vị hành chính hiện hành và khớp Google Business Profile." />
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          {schema.settings.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint} multiline={f.type === 'textarea'} placeholder={defaultOf(f, 'vi')}
              value={get(['settings', f.key])} onChange={(v) => set(['settings', f.key], v || undefined)} />
          ))}
        </div>
      </Card>
    </>
  );
}
