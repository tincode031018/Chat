import { useRef, useState } from 'react';
import { Camera, Check, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import { signOut, updateUser } from '../store/authSlice';
import { api } from '../utils/api';

export default function ProfilePage() {
  const { token, user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const fileInput = useRef(null);
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function selectAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1.5 * 1024 * 1024) {
      setError('Chọn ảnh có dung lượng nhỏ hơn 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.onerror = () => setError('Không thể đọc tệp ảnh.');
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const update = { email, phone, avatar };
      if (newPassword) {
        update.currentPassword = currentPassword;
        update.password = newPassword;
      }
      const result = await api('/user/update', { method: 'PUT', body: JSON.stringify(update) }, token);
      dispatch(updateUser(result.user));
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Thông tin của bạn đã được cập nhật.');
    } catch (requestError) { setError(requestError.message); }
  }

  return <div className="mx-auto w-full max-w-[880px] overflow-y-auto p-4 sm:p-8">
    <div className="mb-7"><p className="text-sm font-semibold text-brand">Tài khoản</p><h1 className="mt-1 text-2xl font-extrabold text-ink">Hồ sơ cá nhân</h1><p className="mt-1 text-sm text-muted">Quản lý thông tin hiển thị và cách mọi người liên hệ với bạn.</p></div>
    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-3xl bg-white p-6 shadow-soft">
        <div className="flex flex-col items-center py-4 text-center"><div className="relative"><Avatar name={user?.username} src={avatar} size="h-24 w-24 text-2xl" online /><button aria-label="Thay đổi ảnh đại diện" className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-4 border-white bg-brand text-white" onClick={() => fileInput.current?.click()}><Camera size={15} /></button><input accept="image/*" className="hidden" onChange={selectAvatar} ref={fileInput} type="file" /></div><h2 className="mt-4 text-lg font-bold text-ink">{user?.username}</h2><p className="mt-1 text-sm text-muted">Thành viên ConnectF</p><span className="mt-4 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đang hoạt động</span></div>
        <div className="mt-5 rounded-2xl bg-[#f7f7fb] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck size={17} className="text-brand" /> Bảo mật tài khoản</div><p className="mt-2 text-xs leading-5 text-muted">Mật khẩu được lưu dưới dạng mã hóa an toàn. Không chia sẻ mã đăng nhập của bạn.</p></div>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-soft sm:p-7">
        <div className="mb-6 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#efefff] text-brand"><UserRound size={19} /></span><div><h2 className="font-bold text-ink">Thông tin cá nhân</h2><p className="mt-0.5 text-xs text-muted">Thông tin của bạn chỉ hiển thị với người bạn kết nối.</p></div></div>
        <form className="space-y-4" onSubmit={save}>
          <label className="field-label">Tên hiển thị<input className="field-input bg-[#f8f9fb] text-muted" disabled value={user?.username || ''} /></label>
          <label className="field-label">Địa chỉ email<input className="field-input" onChange={event => setEmail(event.target.value)} placeholder="ban@example.com" type="email" value={email} /></label>
          <label className="field-label">Số điện thoại<input className="field-input" onChange={event => setPhone(event.target.value)} placeholder="+84 912 345 678" type="tel" value={phone} /></label>
          <div className="border-t border-[#f0f1f5] pt-4"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#8992a4]">Đổi mật khẩu</p><div className="space-y-4"><label className="field-label">Mật khẩu hiện tại<input className="field-input" autoComplete="current-password" onChange={event => setCurrentPassword(event.target.value)} placeholder="Nhập nếu muốn đổi mật khẩu" type="password" value={currentPassword} /></label><label className="field-label">Mật khẩu mới<input className="field-input" autoComplete="new-password" minLength="8" onChange={event => setNewPassword(event.target.value)} placeholder="Tối thiểu 8 ký tự" type="password" value={newPassword} /></label></div></div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          {message && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><Check size={16} />{message}</p>}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row"><button className="h-12 flex-1 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-indigo-600">Lưu thay đổi</button><button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#eceef3] px-5 text-sm font-semibold text-[#697387] hover:bg-slate-50" onClick={() => dispatch(signOut())} type="button"><LogOut size={16} /> Đăng xuất</button></div>
        </form>
      </section>
    </div>
  </div>;
}
