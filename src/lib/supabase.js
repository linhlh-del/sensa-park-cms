import { createClient } from '@supabase/supabase-js';
import { PROJECT } from '@/project';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);
/* Chế độ demo (chỉ khi `npm run dev` + VITE_CMS_DEMO=1): bỏ qua đăng nhập, bản nháp lưu localStorage — để xem thử giao diện */
export const DEMO = Boolean(import.meta.env.DEV && import.meta.env.VITE_CMS_DEMO === '1');

export const supabase = createClient(url || 'http://localhost', key || 'missing', {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Gọi Edge Function cms-admin (publish, rollback, deploy_status, test_lead) */
export async function admin(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('cms-admin', {
    body: { action, project: PROJECT.id, ...payload },
  });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* giữ thông báo gốc */ }
    throw new Error(msg);
  }
  return data;
}

/** Ghi nhật ký thao tác (RLS: actor phải là email đang đăng nhập) */
export function audit(action, detail, actor) {
  return supabase.from('cms_audit_log').insert({ project_id: PROJECT.id, actor, action, detail });
}

/** URL công khai của ảnh trong bucket cms-media */
export const mediaUrl = (path) => supabase.storage.from('cms-media').getPublicUrl(path).data.publicUrl;
