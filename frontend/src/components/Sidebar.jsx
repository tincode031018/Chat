import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, MessageCircle, Plus, Search, Settings2, Users, Video } from 'lucide-react';
import { useSelector } from 'react-redux';
import Avatar from './Avatar';
import BrandMark from './BrandMark';
import { api } from '../utils/api';

const people = [
  { id: 'minh-anh', name: 'Minh Anh', message: 'Chiều nay mình họp nhé!', time: '10:42', online: true, unread: 2 },
  { id: 'team-design', name: 'Team Design', message: 'Hà: Đã gửi một hình ảnh', time: '09:18', group: true },
  { id: 'quang-huy', name: 'Quang Huy', message: 'Cảm ơn bạn nhiều nha 🙌', time: 'Hôm qua' },
  { id: 'project-team', name: 'Dự án ConnectF', message: 'Bạn: Hẹn gặp mọi người!', time: 'T2', group: true },
  { id: 'thao-my', name: 'Thảo My', message: 'Voice message · 0:12', time: 'T2', online: true }
];

export default function Sidebar({ active, onSelect, onCreateGroup, onNewMeeting, onCalendar, onProfile, open, onClose, user }) {
  const { token } = useSelector(state => state.auth);
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupsError, setGroupsError] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadGroups = () => api('/group/list', {}, token)
      .then(result => {
        if (!Array.isArray(result)) throw new Error('Dữ liệu danh sách nhóm không hợp lệ.');
        if (mounted) { setGroups(result); setGroupsError(''); }
      })
      .catch(requestError => { if (mounted) setGroupsError(requestError.message); });
    loadGroups();
    window.addEventListener('connectf:groups-changed', loadGroups);
    return () => {
      mounted = false;
      window.removeEventListener('connectf:groups-changed', loadGroups);
    };
  }, [token]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setContacts([]);
      setSearchError('');
      return undefined;
    }
    let mounted = true;
    const timeout = window.setTimeout(() => {
      setSearching(true);
      api(`/user/search?username=${encodeURIComponent(value)}`, {}, token)
        .then(result => { if (mounted) { setContacts(result); setSearchError(''); } })
        .catch(requestError => { if (mounted) setSearchError(requestError.message); })
        .finally(() => { if (mounted) setSearching(false); });
    }, 250);
    return () => { mounted = false; window.clearTimeout(timeout); };
  }, [query, token]);

  function openRoom(id, details) {
    onSelect(id, details);
    setQuery('');
    setContacts([]);
    onClose();
  }

  return <>
    {open && <button aria-label="Đóng danh sách chat" className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col border-r border-[#eef0f5] bg-white transition-transform lg:static lg:z-auto lg:w-[290px] lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[82px] items-center justify-between px-6">
        <a className="flex items-center gap-2.5" href="#"><span className="text-brand"><BrandMark size={36} /></span><span className="text-xl font-bold tracking-tight text-ink">connectf</span></a>
        <button aria-label="Mở hồ sơ và cài đặt" className="icon-button" onClick={onProfile}><Settings2 size={19} /></button>
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl bg-[#f7f8f9] p-3">
          <Avatar name={user?.username || 'U'} src={user?.avatar} online />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink">{user?.username || 'Bạn'}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8e98aa]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Đang hoạt động</p></div>
          <button aria-label="Mở hồ sơ cá nhân" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#f0f2f4]" onClick={onProfile}><ChevronDown size={16} /></button>
        </div>
      </div>
      <div className="px-4 pb-4">
        <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#eff0f5] px-3.5 text-muted"><Search size={17} /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a8afbd]" onChange={event => setQuery(event.target.value)} placeholder="Tìm chat hoặc username" value={query} />{searching && <span className="h-3 w-3 animate-spin rounded-full border border-[#aab4bc] border-t-transparent" />}</label>
      </div>
      {query.trim().length >= 2 && <div className="mx-3 mb-3 rounded-xl border border-[#e9edef] bg-white p-2">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#87919a]">Tìm người dùng</p>
        {contacts.map(contact => <button key={contact._id || contact.id} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-[#f5f7f8]" onClick={() => openRoom(`dm-${contact._id || contact.id}`, { id: contact._id || contact.id, name: contact.username, avatar: contact.avatar, status: contact.status, sub: contact.status === 'online' ? 'Đang hoạt động' : 'ConnectF' })}><Avatar name={contact.username} src={contact.avatar} online={contact.status === 'online'} size="h-8 w-8" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{contact.username}</span><Plus size={15} /></button>)}
        {!searching && !searchError && contacts.length === 0 && <p className="px-2 py-2 text-xs text-muted">Không tìm thấy người dùng.</p>}
        {searchError && <p className="px-2 py-2 text-xs text-red-600">{searchError}</p>}
      </div>}
      <div className="flex items-center justify-between px-5 pb-2"><h2 className="text-xs font-semibold uppercase tracking-[.08em] text-[#87919a]">Tin nhắn</h2><button aria-label="Tạo nhóm mới" className="icon-button h-8 w-8" onClick={onCreateGroup}><Plus size={17} /></button></div>
      <div className="scrollbar-none flex-1 overflow-y-auto px-2">
        {groupsError && <p className="px-3 py-2 text-xs text-red-600">{groupsError}</p>}
        {people.map(person => <button key={person.id} onClick={() => openRoom(person.id, null)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active === person.id ? 'bg-[#edf1f4]' : 'hover:bg-[#f7f8f9]'}`}>
          <Avatar name={person.name} online={person.online} />
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className={`truncate text-sm ${active === person.id ? 'text-brand' : 'text-ink'}`}>{person.name}</strong><span className="shrink-0 text-[10px] text-[#a5acb9]">{person.time}</span></span><span className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-[#9099aa]">{person.message}</span>{person.unread && <i className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#e8edf1] px-1 text-[10px] font-bold not-italic text-[#536473]">{person.unread}</i>}</span></span>
        </button>)}
        {groups.map(group => <button key={group._id} onClick={() => openRoom(group._id, { id: group._id, name: group.name, avatar: group.avatar, group: true, sub: `${group.members.length} thành viên` })} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active === group._id ? 'bg-[#edf1f4]' : 'hover:bg-[#f7f8f9]'}`}><Avatar name={group.name} src={group.avatar} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{group.name}</span><span className="mt-1 block truncate text-xs text-[#9099aa]">{group.members.length} thành viên</span></span></button>)}
      </div>
      <div className="border-t border-[#f0f1f5] p-3">
        <button className="nav-link" onClick={onNewMeeting}><Video size={18} /><span>Tạo cuộc họp</span><Plus className="ml-auto" size={16} /></button>
        <button className="nav-link" onClick={onCalendar}><CalendarDays size={18} /><span>Lịch của bạn</span></button>
        <button className="nav-link" onClick={onCreateGroup}><Users size={18} /><span>Nhóm của tôi</span></button>
      </div>
    </aside>
  </>;
}
