import { useAuth } from '@/lib/auth';
import { configured } from '@/lib/supabase';
import { PROJECT } from '@/project';

export default function Login() {
  const { state, email, accessError, signIn, signOut } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-stone-100 p-6" style={{ '--accent': PROJECT.accent }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">CMS</p>
        <h1 className="mt-1 text-xl font-semibold text-stone-900">{PROJECT.name}</h1>

        {!configured && (
          <p className="mt-6 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">
            Chưa cấu hình VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (xem .env.example).
          </p>
        )}

        {state === 'error' ? (
          <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">
            Không kiểm tra được quyền truy cập CMS: {accessError}
          </p>
        ) : state === 'denied' ? (
          <>
            <p className="mt-6 text-sm text-stone-600">
              Tài khoản <strong>{email}</strong> chưa được cấp quyền cho dự án này. Liên hệ owner để được thêm vào danh sách thành viên.
            </p>
            <button type="button" onClick={signOut} className="mt-5 h-11 w-full rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50">
              Đăng nhập tài khoản khác
            </button>
          </>
        ) : (
          <button type="button" onClick={signIn} disabled={!configured || state === 'loading'}
            className="mt-8 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50 disabled:opacity-50">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {state === 'loading' ? 'Đang kiểm tra…' : 'Đăng nhập bằng Google'}
          </button>
        )}
        <p className="mt-6 text-xs text-stone-400">Chỉ email được owner thêm vào mới truy cập được.</p>
      </div>
    </div>
  );
}
