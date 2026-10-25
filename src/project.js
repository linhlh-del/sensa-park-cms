/* Cấu hình riêng của CMS này — 2 CMS dùng chung toàn bộ code, chỉ khác file này */
export const PROJECT = {
  id: 'sensa-park',
  name: 'Imperia Sensa Park',
  siteUrl: 'https://imperia-sensa-park.vercel.app',
  /* website xuất schema các section/trường/ảnh + giá trị mặc định tại đây (sinh lúc build website) */
  schemaUrl: import.meta.env.VITE_SCHEMA_URL || 'https://imperia-sensa-park.vercel.app/cms-schema.json',
  accent: '#68734b',
};
