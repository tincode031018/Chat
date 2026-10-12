import { useState } from 'react';
import { ArrowRight, MessageCircle, Video } from 'lucide-react';
import { api } from '../utils/api';
import { useDispatch } from 'react-redux';
import { setSession } from '../store/authSlice';
import BrandMark from './BrandMark';

export default function AuthPage() {
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dispatch = useDispatch();

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api(`/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      dispatch(setSession(result));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1fr_1fr]">
      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-[410px]">
          <a className="mb-14 inline-flex items-center gap-2.5" href="#">
            <span className="text-brand"><BrandMark size={40} /></span>
            <span className="text-[23px] font-bold tracking-tight text-ink">connectf</span>
          </a>
          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold text-brand">Chào mừng bạn đến với ConnectF</p>
            <h1 className="text-[32px] font-extrabold tracking-tight text-ink">{registering ? 'Tạo tài khoản mới' : 'Rất vui được gặp bạn'}</h1>
            <p className="mt-2 text-[15px] leading-6 text-muted">Kết nối với mọi người, ở bất cứ đâu.</p>
          </div>
          <form className="space-y-5" onSubmit={submit}>
            <label className="field-label">Tên đăng nhập
              <input className="field-input" autoComplete="username" minLength="3" maxLength="32" onChange={event => setUsername(event.target.value)} placeholder="Ví dụ: linhnguyen" required value={username} />
            </label>
            <label className="field-label">Mật khẩu
              <input className="field-input" autoComplete={registering ? 'new-password' : 'current-password'} minLength="8" onChange={event => setPassword(event.target.value)} placeholder="Ít nhất 8 ký tự" required type="password" value={password} />
            </label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <button className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-semibold text-white transition hover:bg-[#2d5068] disabled:opacity-60" disabled={busy}>
              {busy ? 'Đang xử lý...' : registering ? 'Tạo tài khoản' : 'Đăng nhập'} {!busy && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            {registering ? 'Đã có tài khoản?' : 'Bạn chưa có tài khoản?'}{' '}
            <button className="font-bold text-brand hover:underline" onClick={() => { setRegistering(!registering); setError(''); }} type="button">
              {registering ? 'Đăng nhập' : 'Đăng ký ngay'}
            </button>
          </p>
          <p className="mt-12 text-center text-xs leading-5 text-muted">Bằng việc tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của ConnectF.</p>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden border-l border-[#eceff1] bg-[#f7f8f9] px-12 py-16 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="relative z-10 max-w-[510px] text-center">
          <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-3xl bg-white text-brand shadow-sm"><MessageCircle size={36} strokeWidth={1.5} /></div>
          <h2 className="text-[38px] font-bold leading-[1.15] tracking-tight text-ink">Mọi cuộc trò chuyện,<br />một nơi thân thuộc.</h2>
          <p className="mx-auto mt-5 max-w-[390px] text-base leading-7 text-[#757d86]">Nhắn tin, chia sẻ khoảnh khắc và gặp nhau trực tuyến thật dễ dàng.</p>
          <div className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-xl border border-[#e8ebee] bg-white px-4 py-3">
            <MessageCircle size={19} className="text-brand" />
            <Video size={19} className="text-[#667582]" />
            <p className="ml-1 text-sm font-medium text-[#53616d]">Riêng tư, đơn giản, tức thì</p>
          </div>
        </div>
        <p className="absolute bottom-7 text-xs text-[#939ab0]">© 2025 ConnectF. Kết nối là niềm vui.</p>
      </aside>
    </main>
  );
}
