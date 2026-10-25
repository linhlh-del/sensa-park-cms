import { supabase, mediaUrl } from './supabase';
import { PROJECT } from '@/project';

const MAX_SIDE = 2400;   // cạnh dài tối đa sau khi nén
const QUALITY = 0.82;

/** Nén ảnh ngay trên trình duyệt → WebP (giữ SVG nguyên bản). Trả { blob, width, height, type } */
export async function compressImage(file) {
  if (file.type === 'image/svg+xml') return { blob: file, width: null, height: null, type: file.type };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', QUALITY));
  if (!blob) throw new Error('Trình duyệt không nén được ảnh này.');
  return { blob, width, height, type: 'image/webp' };
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'anh';

/** Tải ảnh lên bucket cms-media/<project>/<yyyy-mm>/<tên>-<rand>.webp */
export async function uploadImage(file) {
  const { blob, width, height, type } = await compressImage(file);
  const ext = type === 'image/svg+xml' ? 'svg' : 'webp';
  const month = new Date().toISOString().slice(0, 7);
  const name = `${slug(file.name.replace(/\.[^.]+$/, ''))}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${PROJECT.id}/${month}/${name}`;
  const { error } = await supabase.storage.from('cms-media').upload(path, blob, {
    contentType: type, cacheControl: '31536000', upsert: false,
  });
  if (error) throw new Error(`Tải ảnh thất bại: ${error.message}`);
  return { src: mediaUrl(path), path, width, height, size: blob.size };
}

/** Danh sách ảnh đã tải (thư viện) — mới nhất trước */
export async function listImages() {
  const root = PROJECT.id;
  const { data: folders } = await supabase.storage.from('cms-media').list(root, { limit: 100 });
  const months = (folders || []).filter((f) => !f.id).map((f) => f.name).sort().reverse();
  const out = [];
  for (const m of months.slice(0, 12)) {
    const { data } = await supabase.storage.from('cms-media').list(`${root}/${m}`, {
      limit: 200, sortBy: { column: 'created_at', order: 'desc' },
    });
    (data || []).filter((f) => f.id).forEach((f) => out.push({
      path: `${root}/${m}/${f.name}`, src: mediaUrl(`${root}/${m}/${f.name}`), name: f.name,
      size: f.metadata?.size, created: f.created_at,
    }));
  }
  return out;
}

/** Ảnh mặc định của website (đường dẫn tương đối) → URL tuyệt đối để xem trước */
export const siteImage = (src) => (!src ? '' : /^https?:\/\//.test(src) ? src : PROJECT.siteUrl + (src.startsWith('/') ? src : `/${src}`));
