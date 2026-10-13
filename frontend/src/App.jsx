import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Plus, UserRound, Users, Video } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import AuthPage from './components/AuthPage';
import ChatRoom from './components/ChatRoom';
import GroupsPage from './components/GroupsPage';
import MeetingRoom from './components/MeetingRoom';
import MeetingsPage from './components/MeetingsPage';
import ProfilePage from './components/ProfilePage';
import Sidebar from './components/Sidebar';
import { setActiveRoom } from './store/chatSlice';
import { api } from './utils/api';

const navItems = [
  { id: 'chat', label: 'Trò chuyện', icon: MessageCircle },
  { id: 'groups', label: 'Nhóm', icon: Users },
  { id: 'meetings', label: 'Cuộc họp', icon: Video },
  { id: 'profile', label: 'Hồ sơ', icon: UserRound }
];

export default function App() {
  const { token, user } = useSelector(state => state.auth);
  const { activeRoom } = useSelector(state => state.chat);
  const dispatch = useDispatch();
  const [page, setPage] = useState('chat');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createGroupRequested, setCreateGroupRequested] = useState(false);
  const [notice, setNotice] = useState('');
  const inviteAttempted = useRef(false);

  useEffect(() => {
    dispatch(setActiveRoom(null));
    setSelectedConversation(null);
  }, [dispatch, user?.id]);

  useEffect(() => {
    const invitedMeetingId = new URLSearchParams(window.location.search).get('meeting');
    if (!token || !invitedMeetingId || inviteAttempted.current) return;
    inviteAttempted.current = true;
    api('/meeting/join', {
      method: 'POST',
      body: JSON.stringify({ meetingId: invitedMeetingId })
    }, token)
      .then(result => {
        if (result.status === 'waiting') {
          setPage('meetings');
          setNotice(result.message);
        } else {
          setMeeting(result);
        }
      })
      .catch(error => {
        setPage('meetings');
        setNotice(error.message);
      });
  }, [token]);

  if (!token || !user) return <AuthPage />;

  async function createMeeting(options = {}) {
    setCreating(true);
    setNotice('');
    try {
      const result = await api('/meeting/create', { method: 'POST', body: JSON.stringify({ title: options.audioOnly ? 'Cuộc gọi thoại' : 'Cuộc họp nhanh' }) }, token);
      setMeeting({ ...result, audioOnly: Boolean(options.audioOnly) });
    } catch (error) { setNotice(error.message); }
    finally { setCreating(false); }
  }

  function leaveMeeting() {
    setMeeting(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('meeting');
    window.history.replaceState({}, '', url);
  }

  return <div className="flex h-[100dvh] overflow-hidden bg-canvas">
    <Sidebar active={activeRoom} onSelect={(id, details) => { dispatch(setActiveRoom(id)); setSelectedConversation(details); setPage('chat'); }} onCreateGroup={() => { setPage('groups'); setCreateGroupRequested(true); }} onNewMeeting={createMeeting} onCalendar={() => setPage('meetings')} onProfile={() => setPage('profile')} open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="z-10 flex h-[62px] shrink-0 items-center justify-between border-b border-[#e9edef] bg-white px-3 sm:px-6">
        <nav className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-2">
          {navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`flex h-[62px] shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-medium transition sm:px-3.5 sm:text-sm ${page === item.id ? 'border-brand text-brand' : 'border-transparent text-[#78838d] hover:text-ink'}`} onClick={() => setPage(item.id)}><Icon size={16} /><span>{item.label}</span></button>; })}
        </nav>
        <button className="ml-2 flex h-9 shrink-0 items-center gap-2 rounded-lg bg-brand px-3 text-xs font-medium text-white hover:bg-[#2d5068] sm:px-4 sm:text-sm" disabled={creating} onClick={createMeeting}><Plus size={16} /> <span className="hidden sm:inline">{creating ? 'Đang tạo...' : 'Họp ngay'}</span><span className="sm:hidden">Họp</span></button>
      </header>
      <main className="flex min-h-0 flex-1">
        {page === 'chat' && (activeRoom
          ? <ChatRoom conversation={selectedConversation} onOpenMenu={() => setSidebarOpen(true)} onStartMeeting={createMeeting} />
          : <section className="flex min-w-0 flex-1 items-center justify-center bg-white p-6 text-center"><div><MessageCircle className="mx-auto text-[#9aa5af]" size={32} /><h1 className="mt-4 text-lg font-semibold text-ink">Chưa chọn cuộc trò chuyện</h1><p className="mt-2 max-w-sm text-sm leading-6 text-muted">Tìm một người dùng theo tên đăng nhập hoặc tạo nhóm để bắt đầu nhắn tin.</p><button className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white lg:hidden" onClick={() => setSidebarOpen(true)}>Tìm người dùng</button></div></section>)}
        {page === 'groups' && <GroupsPage createRequested={createGroupRequested} onCreateHandled={() => setCreateGroupRequested(false)} />}
        {page === 'profile' && <ProfilePage />}
        {page === 'meetings' && <MeetingsPage token={token} creating={creating} onCreate={createMeeting} onJoin={result => setMeeting(result)} />}
      </main>
    </div>
    {notice && <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">{notice}<button className="ml-4 font-bold" onClick={() => setNotice('')}>×</button></div>}
    {meeting && <MeetingRoom meetingId={meeting.meetingId || meeting.id} audioOnly={meeting.audioOnly} onLeave={leaveMeeting} />}
  </div>;
}
