import { useEffect, useState } from 'react';
import { Plus, UserPlus, Users } from 'lucide-react';
import { useSelector } from 'react-redux';
import { api } from '../utils/api';
import Avatar from './Avatar';

export default function GroupsPage({ createRequested, onCreateHandled }) {
  const { token, user } = useSelector(state => state.auth);
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [member, setMember] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api('/group/list', {}, token)
      .then(result => {
        if (!Array.isArray(result)) throw new Error('Dữ liệu danh sách nhóm không hợp lệ.');
        if (mounted) setGroups(result);
      })
      .catch(requestError => { if (mounted) setError(requestError.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (createRequested) {
      setShowCreate(true);
      onCreateHandled();
    }
  }, [createRequested, onCreateHandled]);

  async function createGroup(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const group = await api('/group/create', { method: 'POST', body: JSON.stringify({ name }) }, token);
      const refreshedGroups = await api('/group/list', {}, token);
      setGroups(refreshedGroups);
      const createdGroup = refreshedGroups.find(item => item._id === group._id) || group;
      setActiveGroup(createdGroup);
      window.dispatchEvent(new Event('connectf:groups-changed'));
      setName('');
      setShowCreate(false);
      setSuccess('Đã tạo nhóm. Bạn có thể thêm thành viên bằng tên đăng nhập.');
    } catch (requestError) { setError(requestError.message); }
  }

  async function addMember(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const updatedGroup = await api('/group/addMember', { method: 'POST', body: JSON.stringify({ groupId: activeGroup._id, username: member }) }, token);
      setGroups(current => current.map(group => group._id === updatedGroup._id ? updatedGroup : group));
      setActiveGroup(updatedGroup);
      setMember('');
      setSuccess(`Đã thêm ${member} vào nhóm.`);
    } catch (requestError) { setError(requestError.message); }
  }

  return <div className="mx-auto w-full max-w-[940px] overflow-y-auto p-4 sm:p-8">
    <div className="mb-7 flex items-end justify-between gap-3"><div><p className="text-sm font-medium text-muted">Kết nối với mọi người</p><h1 className="mt-1 text-2xl font-bold text-ink">Nhóm chat</h1><p className="mt-1 text-sm text-muted">Các cuộc trò chuyện nhóm của bạn.</p></div><button className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-[#2d5068]" onClick={() => setShowCreate(true)}><Plus size={17} /> <span className="hidden sm:inline">Tạo nhóm</span></button></div>
    {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {success && <p className="mb-4 rounded-lg bg-[#f1f5f3] px-4 py-3 text-sm text-[#426854]">{success}</p>}
    <div className="divide-y divide-[#eceff1] border-y border-[#eceff1]">
      {loading && <p className="px-2 py-5 text-sm text-muted">Đang tải nhóm...</p>}
      {!loading && groups.length === 0 && <p className="px-2 py-5 text-sm text-muted">Bạn chưa tham gia nhóm nào.</p>}
      {groups.map(group => <article key={group._id} className="flex items-center gap-4 bg-white px-2 py-4"><Avatar name={group.name} src={group.avatar} size="h-11 w-11 text-sm" /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-ink">{group.name}</h2><p className="mt-1 text-xs text-muted">{group.members.length} thành viên · {group.admins?.some(admin => (admin._id || admin) === user?.id) ? 'Quản trị viên' : 'Thành viên'}</p></div><button aria-label={`Thêm thành viên ${group.name}`} className="icon-button" onClick={() => { setActiveGroup(group); setError(''); setSuccess(''); }}><UserPlus size={18} /></button></article>)}
      <button className="flex min-h-[64px] w-full items-center gap-3 px-2 text-sm font-medium text-muted hover:text-brand" onClick={() => setShowCreate(true)}><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f1f3f5] text-[#687582]"><Users size={17} /></span> Tạo nhóm trò chuyện mới</button>
    </div>
    {activeGroup && <div className="mt-5 border-y border-[#eceff1] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-ink">Thành viên nhóm</h2><p className="mt-1 text-xs text-muted">{activeGroup.name} · {activeGroup.members.length} thành viên</p></div><button aria-label="Đóng" className="icon-button" onClick={() => setActiveGroup(null)}>×</button></div>
      <div className="mb-4 flex flex-wrap gap-2">{activeGroup.members.map(memberItem => { const memberId = memberItem._id || memberItem.id || memberItem; const memberName = memberItem.username || (memberId === user?.id ? user.username : 'Thành viên'); return <span className="rounded-full bg-[#f1f3f5] px-3 py-1.5 text-xs text-[#53616d]" key={memberId}>{memberName}{activeGroup.admins?.some(admin => (admin._id || admin) === memberId) ? ' · admin' : ''}</span>; })}</div>
      {activeGroup.admins?.some(admin => (admin._id || admin) === user?.id) ? <form className="flex flex-col gap-3 sm:flex-row" onSubmit={addMember}><input className="field-input flex-1" onChange={event => setMember(event.target.value)} placeholder="Tên đăng nhập cần thêm" required value={member} /><button className="h-12 rounded-xl bg-brand px-5 text-sm font-semibold text-white"><UserPlus size={16} className="mr-2 inline" />Thêm thành viên</button></form> : <p className="text-sm text-muted">Chỉ quản trị viên mới có thể thêm thành viên.</p>}
    </div>}
    {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setShowCreate(false); }}><form className="w-full max-w-md border border-[#e8ebee] bg-white p-6 shadow-xl" onSubmit={createGroup}><h2 className="text-xl font-bold text-ink">Tạo nhóm mới</h2><p className="mt-1 text-sm text-muted">Đặt tên để mọi người dễ tìm thấy nhóm.</p><label className="field-label mt-5">Tên nhóm<input autoFocus className="field-input" maxLength="80" onChange={event => setName(event.target.value)} placeholder="Ví dụ: Team Design" required value={name} /></label><div className="mt-6 flex gap-3"><button className="h-12 flex-1 border border-[#eceef3] text-sm font-medium text-muted" onClick={() => setShowCreate(false)} type="button">Hủy</button><button className="h-12 flex-1 bg-brand text-sm font-medium text-white">Tạo nhóm</button></div></form></div>}
  </div>;
}
