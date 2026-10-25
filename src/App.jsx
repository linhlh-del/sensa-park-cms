import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ContentProvider } from '@/lib/content';
import { ToastProvider } from '@/components/ui';
import Shell from '@/components/Shell';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Content from '@/pages/Content';
import Layout from '@/pages/Layout';
import Seo from '@/pages/Seo';
import Settings from '@/pages/Settings';
import Head from '@/pages/Head';
import Leads from '@/pages/Leads';
import LeadSettings from '@/pages/LeadSettings';
import Publish from '@/pages/Publish';
import Members from '@/pages/Members';
import Audit from '@/pages/Audit';

/* route → quyền cần có (khớp CAN trong lib/auth.jsx) */
const ROUTES = [
  ['/', Dashboard, 'dashboard'],
  ['/noi-dung', Content, 'content'],
  ['/layout', Layout, 'content'],
  ['/seo', Seo, 'content'],
  ['/thong-tin', Settings, 'content'],
  ['/the-head', Head, 'head'],
  ['/lead', Leads, 'leads'],
  ['/cai-dat-lead', LeadSettings, 'leadSettings'],
  ['/dang', Publish, 'publish'],
  ['/thanh-vien', Members, 'members'],
  ['/nhat-ky', Audit, 'audit'],
];

function Gate() {
  const { state, can } = useAuth();
  if (state === 'loading') return <div className="grid min-h-screen place-items-center text-sm text-stone-500">Đang tải…</div>;
  if (state !== 'ok') return <Login />;
  return (
    <ContentProvider>
      <Routes>
        <Route element={<Shell />}>
          {ROUTES.map(([path, Page, perm]) => (
            <Route key={path} path={path} element={can(perm) ? <Page /> : <Navigate to={can('dashboard') ? '/' : '/lead'} replace />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ContentProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
