import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { ArrowLeft, CheckCheck, FilePlus2, Image, Mic, MoreHorizontal, Paperclip, Phone, Search, Send, Smile, Video, X } from 'lucide-react';
import Avatar from './Avatar';
import { addMessage, setMessages } from '../store/chatSlice';
import { api } from '../utils/api';

const emojiChoices = ['😀', '😂', '😍', '👍', '❤️', '🎉', '🙏', '😮', '😢', '🔥', '✅', '👋'];

function MessageBubble({ message, mine, avatar, sender }) {
  const isImage = message.type === 'image' && message.content.startsWith('data:image/');
  const isVideo = message.type === 'file' && message.content.startsWith('data:video/');
  const isAudio = message.type === 'voice' && message.content.startsWith('data:audio/');
  const isPdf = message.type === 'file' && message.content.startsWith('data:application/pdf');
  return <div className={`flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
    {!mine && <Avatar name={sender || avatar} size="h-8 w-8" />}
    <div className={`max-w-[78%] sm:max-w-[65%] ${mine ? 'text-right' : ''}`}>
      {!mine && sender && <p className="mb-1 ml-1 text-[11px] font-semibold text-muted">{sender}</p>}
      <div className={`rounded-[18px] px-4 py-3 text-left text-[14px] leading-6 ${mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-[#f1f3f5] text-ink'}`}>
        {isImage && <a download={message.fileName || 'connectf-image'} href={message.content}><img alt={message.fileName || 'Ảnh đính kèm'} className="max-h-64 max-w-full rounded-lg object-contain" src={message.content} /></a>}
        {isVideo && <video className="max-h-64 max-w-full rounded-lg" controls src={message.content} />}
        {isAudio && <audio className="max-w-full" controls src={message.content} />}
        {isPdf && <a className="flex items-center gap-2 underline" download={message.fileName || 'connectf-document.pdf'} href={message.content}><FilePlus2 size={18} />{message.fileName || 'Mở tài liệu PDF'}</a>}
        {!isImage && !isVideo && !isAudio && !isPdf && (message.content.startsWith('data:') ? <a className="underline" download={message.fileName || 'connectf-file'} href={message.content}>{message.fileName || 'Tải tệp đính kèm'}</a> : message.content)}
      </div>
      <p className={`mt-1 flex items-center gap-1 text-[10px] text-[#a0a8b6] ${mine ? 'justify-end' : ''}`}>{new Date(message.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{mine && <CheckCheck size={13} className="text-brand" />}</p>
    </div>
  </div>;
}

export default function ChatRoom({ onOpenMenu, onStartMeeting, conversation }) {
  const dispatch = useDispatch();
  const { activeRoom, messages } = useSelector(state => state.chat);
  const { token, user } = useSelector(state => state.auth);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [recording, setRecording] = useState(false);
  const endRef = useRef(null);
  const fileInput = useRef(null);
  const imageInput = useRef(null);
  const recorder = useRef(null);
  const recorderStream = useRef(null);
  const recordingTimeout = useRef(null);
  const room = conversation || { name: 'Cuộc trò chuyện' };
  const socket = useMemo(() => token ? io('/', { path: '/socket.io', auth: { token }, autoConnect: false }) : null, [token]);
  const today = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long' }).format(new Date());

  useEffect(() => {
    let mounted = true;
    api(`/chat/${encodeURIComponent(activeRoom)}`, {}, token)
      .then(data => { if (mounted) dispatch(setMessages(data)); })
      .catch(requestError => { if (mounted) setError(requestError.message); });
    return () => { mounted = false; };
  }, [activeRoom, dispatch, token]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.connect();
    socket.emit('chat:join', activeRoom);
    socket.on('chat:message', message => {
      if (message.roomId === activeRoom) dispatch(addMessage(message));
    });
    return () => { socket.disconnect(); };
  }, [activeRoom, dispatch, socket]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => () => {
    window.clearTimeout(recordingTimeout.current);
    recorderStream.current?.getTracks().forEach(track => track.stop());
  }, []);

  async function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim() && !attachment) return;
    setError('');
    try {
      const message = await api('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: activeRoom,
          content: attachment?.content || draft.trim(),
          type: attachment?.type || 'text',
          fileName: attachment?.name || ''
        })
      }, token);
      dispatch(addMessage(message));
      setDraft('');
      setAttachment(null);
      setEmojiOpen(false);
    } catch (requestError) { setError(requestError.message); }
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Không thể đọc tệp này.'));
      reader.readAsDataURL(file);
    });
  }

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'audio/mp4', 'audio/webm'];
    if (!supported.includes(file.type)) { setError('Định dạng được hỗ trợ: ảnh JPG/PNG/GIF/WebP, PDF, MP4 và audio WebM.'); return; }
    if (file.size > 1.4 * 1024 * 1024) { setError('Tệp đính kèm tối đa 1.4 MB trong chế độ lưu local.'); return; }
    try {
      setError('');
      setAttachment({
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'voice' : 'file',
        content: await readFile(file)
      });
    } catch (readError) { setError(readError.message); }
  }

  async function toggleVoiceRecording() {
    if (recording && recorder.current) {
      recorder.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Trình duyệt này chưa hỗ trợ ghi âm. Hãy thử Chrome hoặc Edge.');
      return;
    }
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStream.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      mediaRecorder.onstop = async () => {
        window.clearTimeout(recordingTimeout.current);
        stream.getTracks().forEach(track => track.stop());
        recorderStream.current = null;
        recorder.current = null;
        setRecording(false);
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (!blob.size) return;
        if (blob.size > 1.4 * 1024 * 1024) { setError('Bản ghi quá lớn (giới hạn 1.4 MB). Hãy ghi âm ngắn hơn.'); return; }
        setAttachment({ name: 'tin-nhan-thoai.webm', type: 'voice', content: await readFile(blob) });
      };
      mediaRecorder.start();
      setRecording(true);
      recordingTimeout.current = window.setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, 60_000);
    } catch (recordError) {
      recorderStream.current?.getTracks().forEach(track => track.stop());
      recorderStream.current = null;
      setError(recordError.name === 'NotAllowedError' ? 'Bạn chưa cấp quyền sử dụng micro.' : 'Không thể bắt đầu ghi âm.');
    }
  }

  const visibleMessages = messages.filter(message => !messageSearch.trim() || message.content.toLowerCase().includes(messageSearch.trim().toLowerCase()) || message.fileName?.toLowerCase().includes(messageSearch.trim().toLowerCase()));
  const roomTitle = room.name || room.username || 'Cuộc trò chuyện';

  function appendEmoji(emoji) {
    setDraft(current => `${current}${emoji}`);
    setEmojiOpen(false);
  }

  function callVoice() {
    onStartMeeting({ audioOnly: true });
  }

  function renderAttachmentPreview() {
    if (!attachment) return null;
    return <div className="mb-2 flex items-center gap-3 rounded-lg border border-[#e6eaed] bg-[#f8f9fa] p-2">
      {attachment.type === 'image' ? <img alt="" className="h-12 w-12 rounded object-cover" src={attachment.content} /> : <FilePlus2 size={19} className="shrink-0 text-muted" />}
      {attachment.type === 'voice' && <audio className="h-8 max-w-[130px]" controls src={attachment.content} />}
      <span className="min-w-0 flex-1 truncate text-xs text-ink">{attachment.name}</span>
      <button aria-label="Bỏ tệp đính kèm" className="icon-button h-8 w-8" onClick={() => setAttachment(null)} type="button"><X size={16} /></button>
    </div>;
  }

  function clearAttachmentInput(event) {
    event.target.value = '';
  }

  return <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
    <header className="flex h-[78px] shrink-0 items-center justify-between border-b border-[#eff0f5] px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><button aria-label="Mở danh sách chat" className="icon-button lg:hidden" onClick={onOpenMenu}><ArrowLeft size={19} /></button><Avatar name={roomTitle} src={room.avatar} online={room.online || room.status === 'online'} /><div className="min-w-0"><h1 className="truncate text-[15px] font-bold text-ink">{roomTitle}</h1><p className="mt-0.5 truncate text-xs text-muted">{room.sub || (room.status === 'online' ? 'Đang hoạt động' : room.group ? 'Nhóm chat' : 'ConnectF')}</p></div></div>
      <div className="flex items-center gap-1 sm:gap-2"><button aria-label="Gọi thoại" className="icon-button hidden sm:grid" onClick={callVoice}><Phone size={18} /></button><button aria-label="Bắt đầu họp video" className="icon-button" onClick={() => onStartMeeting()}><Video size={19} /></button><button aria-label="Tìm trong cuộc trò chuyện" className={`icon-button ${detailsOpen ? 'bg-[#edf1f4] text-brand' : ''}`} onClick={() => setDetailsOpen(!detailsOpen)}><MoreHorizontal size={20} /></button></div>
    </header>
    {detailsOpen && <div className="border-b border-[#e9edef] bg-[#fafbfb] px-4 py-3 sm:px-7"><div className="flex items-center gap-2"><Search size={16} className="text-muted" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa3ab]" onChange={event => setMessageSearch(event.target.value)} placeholder="Tìm tin nhắn hoặc tên tệp trong hội thoại" value={messageSearch} /><button aria-label="Đóng tìm kiếm" className="icon-button h-8 w-8" onClick={() => { setDetailsOpen(false); setMessageSearch(''); }}><X size={16} /></button></div><p className="mt-2 text-[11px] text-muted">{visibleMessages.length} tin nhắn{room.group ? ` · ${room.sub || 'Nhóm chat'}` : ''}</p></div>}
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-7">
      <div className="mx-auto mb-6 rounded-full bg-[#f5f6f7] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8d969f]">Hôm nay, {today}</div>
      {messages.length === 0 && <div className="my-auto text-center text-sm text-muted">Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện nhé.</div>}
      <div className="mt-auto space-y-5">
        {visibleMessages.map((message, index) => <MessageBubble key={message._id || `${message.createdAt}-${index}`} message={message} mine={message.sender?._id === user?.id || message.sender?.id === user?.id || message.sender === user?.id} avatar={roomTitle} sender={room.group ? message.sender?.username : null} />)}
      </div>
      {error && <p className="mx-auto mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <div ref={endRef} />
    </div>
    <div className="shrink-0 px-3 pb-4 pt-2 sm:px-6 sm:pb-6">
      {renderAttachmentPreview()}
      <form onSubmit={sendMessage} className="relative flex items-end gap-2 rounded-xl border border-[#e6eaed] bg-white px-3 py-2.5 sm:gap-3 sm:px-4">
        <button aria-label="Đính kèm tệp" className="icon-button mb-0.5 h-9 w-9" onClick={() => fileInput.current?.click()} type="button"><Paperclip size={18} /></button>
        <input accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,audio/mp4,audio/webm" className="hidden" onChange={chooseFile} ref={fileInput} type="file" />
        <button aria-label="Thêm ảnh" className="icon-button mb-0.5 hidden h-9 w-9 sm:grid" onClick={() => imageInput.current?.click()} type="button"><Image size={18} /></button>
        <input accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={chooseFile} onClick={clearAttachmentInput} ref={imageInput} type="file" />
        <button aria-label={recording ? 'Dừng ghi âm' : 'Ghi tin nhắn thoại'} className={`icon-button mb-0.5 hidden h-9 w-9 sm:grid ${recording ? 'bg-red-50 text-red-600' : ''}`} onClick={toggleVoiceRecording} type="button"><MicIcon recording={recording} /></button>
        <input className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-[#adb4c1]" onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder={recording ? 'Đang ghi âm… nhấn micro để dừng' : 'Nhập tin nhắn...'} value={draft} />
        <div className="relative"><button aria-label="Chọn emoji" className="icon-button mb-0.5 hidden h-9 w-9 sm:grid" onClick={() => setEmojiOpen(!emojiOpen)} type="button"><Smile size={18} /></button>
          {emojiOpen && <div className="absolute bottom-12 right-0 z-20 grid w-52 grid-cols-6 gap-1 rounded-xl border border-[#e6eaed] bg-white p-2 shadow-lg">{emojiChoices.map(emoji => <button className="grid h-8 w-8 place-items-center rounded hover:bg-[#f1f3f5]" key={emoji} onClick={() => appendEmoji(emoji)} type="button">{emoji}</button>)}</div>}
        </div>
        <button aria-label="Gửi tin nhắn" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white transition hover:bg-[#2d5068] disabled:opacity-50" disabled={!draft.trim() && !attachment}><Send size={17} /></button>
      </form>
      {recording && <p className="mt-2 text-center text-xs text-red-600">Đang ghi âm. Bản ghi sẽ đính kèm sau khi bạn dừng.</p>}
      <p className="mt-2 hidden text-center text-[10px] text-[#b0b7c2] sm:block">Nhấn Enter để gửi tin nhắn</p>
    </div>
  </section>;
}

function MicIcon({ recording }) {
  return recording ? <span className="h-3 w-3 rounded-sm bg-current" /> : <Mic size={18} />;
}
