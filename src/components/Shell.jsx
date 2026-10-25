import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useContent } from '@/lib/content';
import { PROJECT } from '@/project';
import { Button, useToast } from './ui';

const NAV = [
  ['/', 'Dashboard', 'dashboard'],
  ['/noi-dung', 'Nội dung & ảnh', 'content'],
  ['/layout', 'Bố cục section', 'content'],
  ['/seo', 'SEO từng trang', 'content'],
  ['/thong-tin', 'Thông tin chung', 'content'],
  ['/the-head', 'Thẻ head & tracking', 'head'],
  ['/lead', 'Lead', 'leads'],
  ['/cai-dat-lead', 'Gửi lead (Worker)', 'leadSettings'],
  ['/dang', 'Đăng & lịch sử', 'publish'],
  ['/thanh-vien', 'Thành viên', 'members'],
  ['/nhat-ky', 'Nhật ký', 'audit'],
];

/** Khung trang: thanh bên trái + thanh lưu nháp cố định khi có thay đổi */
export default function Shell() {
  const { email, role, can, signOut } = useAuth();
  const { dirty, saving, save, discard } = useContent();
  const toast = useToast();

  const onSave = async () => {
    try { await save(); toast('Đã lưu bản nháp. Vào "Đăng & lịch sử" để đưa lên website.'); }
    catch (e) { toast(e.message, 'red'); }
  };

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-800" style={{ '--accent': PROJECT.accent }}>
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">CMS</p>
          <p className="font-semibold text-stone-900">{PROJECT.name}</p>
          <a href={PROJECT.siteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline">Mở website ↗</a>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV.filter(([, , perm]) => can(perm)).map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `mb-0.5 flex h-9 items-center rounded-lg px-3 text-sm ${isActive ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-stone-100 p-4 text-xs text-stone-500">
          <p className="truncate" title={email}>{email}</p>
          <p className="mt-0.5 uppercase tracking-wider text-stone-400">{role}</p>
          <button type="button" onClick={signOut} className="mt-2 text-[var(--accent)] hover:underline">Đăng xuất</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-7 pb-28">
        <Outlet />
      </main>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-amber-50/95 backdrop-blur">
          <div className="ml-60 flex items-center justify-between gap-4 px-8 py-3">
            <p className="text-sm text-amber-900">Có thay đổi chưa lưu. Lưu nháp không ảnh hưởng website cho tới khi bấm Đăng.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={discard} disabled={saving}>Huỷ thay đổi</Button>
              <Button onClick={onSave} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu nháp'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
