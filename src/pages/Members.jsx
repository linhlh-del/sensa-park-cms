import { useCallback, useEffect, useState } from 'react';
import { supabase, audit } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PROJECT } from '@/project';
import { Button, Card, PageHeader, fmtDate, useToast } from '@/components/ui';

const ROLES = [
  ['owner', 'Owner — toàn quyền, thẻ head, lead, thành viên'],
  ['editor', 'Editor — sửa nội dung, ảnh, layout, SEO và đăng'],
  ['sales', 'Sales — xem & cập nhật lead'],
  ['viewer', 'Viewer — chỉ xem dashboard'],
];

/** Danh sách email Google được vào CMS dự án này (whitelist) và vai trò */
export default function Members() {
  const { email: me } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');

  const load = useCallback(async () => {
    const { data } = await supabase.from('cms_members').select('*').eq('project_id', PROJECT.id).order('created_at');
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast('Email không hợp lệ.', 'red'); return; }
    const { error } = await supabase.from('cms_members').upsert({ project_id: PROJECT.id, email: e, role, added_by: me });
    if (error) { toast(error.message, 'red'); return; }
    audit('member.upsert', { email: e, role }, me);
    setEmail('');
    load();
  };
  const remove = async (r) => {
    if (r.email === me) { toast('Không thể tự xoá chính mình.', 'red'); return; }
    if (!window.confirm(`Xoá quyền truy cập của ${r.email}?`)) return;
    const { error } = await supabase.from('cms_members').delete().eq('project_id', PROJECT.id).eq('email', r.email);
    if (error) { toast(error.message, 'red'); return; }
    audit('member.remove', { email: r.email }, me);
    load();
  };
  const change = async (r, next) => {
    if (r.email === me && next !== 'owner' && rows.filter((x) => x.role === 'owner').length < 2) {
      toast('Cần ít nhất một owner khác trước khi tự hạ quyền.', 'red'); return;
    }
    const { error } = await supabase.from('cms_members').update({ role: next }).eq('project_id', PROJECT.id).eq('email', r.email);
    if (error) { toast(error.message, 'red'); return; }
    audit('member.role', { email: r.email, role: next }, me);
    load();
  };

  return (
    <>
      <PageHeader title="Thành viên" description="Chỉ các email Google trong danh sách mới đăng nhập được. Người rời dự án: xoá khỏi danh sách để thu hồi quyền ngay." />
      <Card title="Thêm thành viên" className="mb-6">
        <div className="flex flex-wrap gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" className="h-10 w-72 rounded-lg border border-stone-300 px-3 text-sm" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-lg border border-stone-300 px-2 text-sm">
            {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <Button onClick={add}>Thêm</Button>
        </div>
      </Card>
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-stone-400">
            <tr><th className="py-2">Email</th><th>Vai trò</th><th>Thêm bởi</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => (
              <tr key={r.email}>
                <td className="py-2.5 font-medium">{r.email}{r.email === me && <span className="ml-2 text-xs text-stone-400">(bạn)</span>}</td>
                <td>
                  <select value={r.role} onChange={(e) => change(r, e.target.value)} className="h-8 rounded-md border border-stone-200 px-1.5 text-xs">
                    {ROLES.map(([k]) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </td>
                <td className="text-xs text-stone-500">{r.added_by || '—'} · {fmtDate(r.created_at)}</td>
                <td className="text-right"><Button size="sm" variant="ghost" onClick={() => remove(r)}>Xoá</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
