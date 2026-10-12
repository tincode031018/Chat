import { useState } from 'react';
import { CalendarDays, Users, Video } from 'lucide-react';
import { api } from '../utils/api';

export default function MeetingsPage({ token, creating, onCreate, onJoin }) {
  const [meetingId, setMeetingId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function joinMeeting(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api('/meeting/join', {
        method: 'POST',
        body: JSON.stringify({ meetingId: meetingId.trim(), password })
      }, token);
      if (result.status === 'waiting') {
        setMessage(result.message);
      } else {
        onJoin(result);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto w-full max-w-[900px] overflow-y-auto p-4 sm:p-8">
    <div className="mb-7">
      <p className="text-sm font-semibold text-brand">Gặp mặt trực tuyến</p>
      <h1 className="mt-1 text-2xl font-extrabold text-ink">Cuộc họp</h1>
      <p className="mt-1 text-sm text-muted">Bắt đầu cuộc gọi hoặc tham gia phòng bằng mã mời.</p>
    </div>
    <div className="rounded-3xl bg-white p-6 shadow-soft sm:p-9">
      <div className="grid gap-7 md:grid-cols-[1fr_1fr] md:items-center">
        <div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eeedff] text-brand"><Video size={23} /></span>
          <h2 className="mt-5 text-xl font-bold text-ink">Một cuộc gọi là đủ gần</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">Tạo không gian để cả nhóm cùng trò chuyện. Mời mọi người bằng liên kết cuộc họp.</p>
          <button className="mt-6 flex h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-indigo-600" disabled={creating} onClick={onCreate}><Video size={17} /> {creating ? 'Đang tạo...' : 'Bắt đầu cuộc họp'}</button>
        </div>
        <div className="grid grid-cols-2 gap-3">{['L', 'M', 'Q', 'T'].map(initial => <div key={initial} className="grid h-28 place-items-center rounded-xl bg-[#f1f3f5]"><span className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-semibold text-[#65727e]">{initial}</span></div>)}</div>
      </div>
      <div className="mt-8 border-t border-[#f0f1f5] pt-6">
        <h3 className="mb-3 text-sm font-bold text-ink">Tham gia cuộc họp</h3>
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={joinMeeting}>
          <input className="field-input" onChange={event => setMeetingId(event.target.value)} placeholder="Mã cuộc họp" required value={meetingId} />
          <input className="field-input" onChange={event => setPassword(event.target.value)} placeholder="Mật khẩu (nếu có)" type="password" value={password} />
          <button className="h-12 rounded-xl border border-[#e6e7ef] px-5 text-sm font-semibold text-ink hover:bg-slate-50" disabled={busy}>{busy ? 'Đang tham gia...' : 'Tham gia'}</button>
        </form>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{message}</p>}
      </div>
      <div className="mt-8 grid gap-3 border-t border-[#f0f1f5] pt-6 sm:grid-cols-3"><div className="flex items-center gap-3 rounded-xl bg-[#f8f9fb] p-3"><Video size={17} className="text-brand" /><span className="text-xs font-medium text-[#687286]">Video trên thiết bị</span></div><div className="flex items-center gap-3 rounded-xl bg-[#f8f9fb] p-3"><Users size={17} className="text-brand" /><span className="text-xs font-medium text-[#687286]">Mời bằng mã phòng</span></div><div className="flex items-center gap-3 rounded-xl bg-[#f8f9fb] p-3"><CalendarDays size={17} className="text-brand" /><span className="text-xs font-medium text-[#687286]">Mã phòng duy nhất</span></div></div>
    </div>
  </div>;
}
