import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Copy, Grid2X2, MessageCircle, Mic, MicOff,
  MoreHorizontal, PhoneOff, ScreenShare, Send, Smile, Square, Users,
  Video, VideoOff
} from 'lucide-react';
import Avatar from './Avatar';

const participants = [{ id: 'local', name: 'Bạn', initials: 'B' }];
const reactions = ['👍', '❤️', '😂', '👏', '🎉', '✋'];

function VideoTile({ person, large, cameraStream, displayStream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = displayStream || cameraStream || null;
  }, [cameraStream, displayStream]);

  const local = person.id === 'local';
  return <div className={`relative flex min-h-[120px] items-center justify-center overflow-hidden rounded-xl bg-[#30363b] ${large ? 'min-h-[260px] md:min-h-0' : 'md:min-h-0'}`}>
    {local && (cameraStream || displayStream) && <video autoPlay className={`absolute inset-0 h-full w-full ${displayStream ? 'object-contain' : 'object-cover'}`} muted playsInline ref={videoRef} />}
    {(!local || (!cameraStream && !displayStream)) && <div className={`relative grid place-items-center rounded-full border border-white/15 bg-[#4a535b] ${large ? 'h-24 w-24 text-2xl' : 'h-14 w-14'} font-semibold text-white`}>{person.initials}</div>}
    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/45 px-2.5 py-1.5 text-xs font-medium text-white"><span className="h-1.5 w-1.5 rounded-full bg-[#60c497]" />{person.name}{local ? ' (bạn)' : ''}</div>
  </div>;
}

export default function MeetingRoom({ onLeave, meetingId, audioOnly = false }) {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [displayStream, setDisplayStream] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [grid, setGrid] = useState(true);
  const [panel, setPanel] = useState('');
  const [notice, setNotice] = useState('');
  const [reaction, setReaction] = useState('');
  const [raisedHand, setRaisedHand] = useState(false);
  const [recording, setRecording] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const cameraRef = useRef(null);
  const displayRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const reactionTimer = useRef(null);
  const noticeTimer = useRef(null);
  const cameraStreamRef = useRef(null);
  const displayStreamRef = useRef(null);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    displayStreamRef.current?.getTracks().forEach(track => track.stop());
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    window.clearTimeout(reactionTimer.current);
    window.clearTimeout(noticeTimer.current);
  }, []);

  function announce(text) {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3500);
  }

  async function enableDevices({ audio = micOn, video = cameraOn } = {}) {
    if (!navigator.mediaDevices?.getUserMedia) {
      announce('Trình duyệt này chưa hỗ trợ micro/camera.');
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      cameraStreamRef.current?.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setMicOn(audio);
      setCameraOn(video);
      return stream;
    } catch (error) {
      announce(error.name === 'NotAllowedError' ? 'Hãy cấp quyền micro/camera cho trình duyệt.' : 'Không thể mở micro hoặc camera.');
      return null;
    }
  }

  async function toggleMic() {
    if (cameraStream?.getAudioTracks().length) {
      const next = !micOn;
      cameraStream.getAudioTracks().forEach(track => { track.enabled = next; });
      setMicOn(next);
      return;
    }
    if (micOn) { setMicOn(false); return; }
    await enableDevices({ audio: true, video: cameraOn });
  }

  async function toggleCamera() {
    if (audioOnly) { announce('Cuộc gọi này đang ở chế độ thoại.'); return; }
    if (cameraStream?.getVideoTracks().length) {
      const next = !cameraOn;
      cameraStream.getVideoTracks().forEach(track => { track.enabled = next; });
      setCameraOn(next);
      return;
    }
    if (cameraOn) { setCameraOn(false); return; }
    await enableDevices({ audio: micOn, video: true });
  }

  async function shareScreen() {
    if (displayStream) {
      displayStream.getTracks().forEach(track => track.stop());
      displayStreamRef.current = null;
      setDisplayStream(null);
      setSharing(false);
      announce('Đã dừng chia sẻ màn hình.');
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      announce('Trình duyệt này chưa hỗ trợ chia sẻ màn hình.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        displayStreamRef.current = null;
        setDisplayStream(null);
        setSharing(false);
      }, { once: true });
      displayStreamRef.current = stream;
      setDisplayStream(stream);
      setSharing(true);
      announce('Đang chia sẻ màn hình trên thiết bị này.');
    } catch (error) {
      if (error.name !== 'NotAllowedError') announce('Không thể bắt đầu chia sẻ màn hình.');
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?meeting=${encodeURIComponent(meetingId || '')}`);
      announce('Đã sao chép liên kết mời.');
    } catch {
      announce('Không thể sao chép liên kết trên trình duyệt này.');
    }
  }

  function showReaction(value) {
    if (value === '✋') {
      setRaisedHand(current => !current);
      setPanel('');
      return;
    }
    setReaction(value);
    setPanel('');
    window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => setReaction(''), 2500);
  }

  function toggleRecording() {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    const videoTracks = displayStream?.getVideoTracks().filter(track => track.readyState === 'live') || cameraStream?.getVideoTracks().filter(track => track.readyState === 'live') || [];
    const audioTracks = cameraStream?.getAudioTracks().filter(track => track.readyState === 'live') || [];
    const tracks = [...videoTracks, ...audioTracks];
    if (!tracks.length) {
      announce('Bật camera hoặc chia sẻ màn hình trước khi ghi hình.');
      return;
    }
    if (!window.MediaRecorder) {
      announce('Trình duyệt này chưa hỗ trợ ghi hình.');
      return;
    }
    try {
      const recordingStream = new MediaStream(tracks);
      const mediaRecorder = new MediaRecorder(recordingStream);
      recordedChunks.current = [];
      mediaRecorder.ondataavailable = event => { if (event.data.size) recordedChunks.current.push(event.data); };
      mediaRecorder.onstop = () => {
        setRecording(false);
        if (!recordedChunks.current.length) { announce('Không có dữ liệu để lưu.'); return; }
        const blob = new Blob(recordedChunks.current, { type: mediaRecorder.mimeType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `connectf-meeting-${meetingId || 'recording'}.webm`;
        link.click();
        URL.revokeObjectURL(url);
        announce('Đã tải bản ghi xuống thiết bị.');
      };
      recorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      announce('Đang ghi hình cục bộ trên thiết bị này.');
    } catch {
      announce('Không thể bắt đầu ghi hình.');
    }
  }

  function sendMeetingChat(event) {
    event.preventDefault();
    const content = chatDraft.trim();
    if (!content) return;
    setChatMessages(current => [...current, { id: `${Date.now()}-${current.length}`, content, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    setChatDraft('');
  }

  function leaveMeeting() {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    displayStreamRef.current?.getTracks().forEach(track => track.stop());
    onLeave();
  }

  return <main className="fixed inset-0 z-50 flex flex-col bg-[#171927] text-white">
    <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-7">
      <div className="flex items-center gap-3"><button aria-label="Rời khỏi cuộc họp" className="grid h-9 w-9 place-items-center rounded-xl text-white/70 hover:bg-white/10" onClick={leaveMeeting}><ArrowLeft size={19} /></button><div><h1 className="text-sm font-bold">{audioOnly ? 'Cuộc gọi thoại' : 'Phòng họp ConnectF'}</h1><p className="mt-0.5 text-[11px] text-white/50">Mã phòng: {meetingId || 'local'}</p></div></div>
      <div className="flex items-center gap-2"><button className="meeting-header-button hidden sm:flex" onClick={copyInvite}><Copy size={15} /> Sao chép link</button><button aria-label={grid ? 'Chuyển sang danh sách' : 'Chuyển sang lưới'} className="grid h-9 w-9 place-items-center rounded-xl text-white/70 hover:bg-white/10" onClick={() => setGrid(!grid)}><Grid2X2 size={18} /></button><button aria-label="Danh sách thành viên" className={`grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10 ${panel === 'participants' ? 'bg-white/10 text-white' : 'text-white/70'}`} onClick={() => setPanel(panel === 'participants' ? '' : 'participants')}><Users size={18} /></button><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{participants.length}</span></div>
    </header>
    <div className="flex min-h-0 flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-[#202427] p-3 sm:gap-4 sm:p-6">
        {reaction && <div className="pointer-events-none absolute left-1/2 top-1/3 z-10 -translate-x-1/2 text-6xl">{reaction}</div>}
        {raisedHand && <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-[#454b50] px-3 py-2 text-xs"><span>✋</span> Bạn đã giơ tay <button className="text-white/60 underline" onClick={() => setRaisedHand(false)}>Hạ tay</button></div>}
        <div className={`grid w-full ${grid ? 'max-w-[1200px] flex-1 min-h-0 grid-cols-1 md:grid-rows-1' : 'max-w-[640px] content-start grid-cols-1'} gap-3`}>
          {participants.map((person, index) => <VideoTile key={person.id} person={person} large={grid && index === 0} cameraStream={person.id === 'local' && cameraOn ? cameraStream : null} displayStream={person.id === 'local' ? displayStream : null} />)}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#242637] px-3 py-2 text-xs text-white/65 sm:gap-3 sm:px-4"><span className="h-2 w-2 rounded-full bg-[#60c497]" /> Cuộc họp cục bộ <span className="hidden sm:inline">·</span><button className="hidden items-center gap-1 text-white/85 sm:flex" onClick={copyInvite}><Copy size={12} /> Mời người khác</button></div>
      </div>
      {panel && <aside className="absolute inset-y-[70px] right-0 z-20 flex w-full max-w-[350px] flex-col border-l border-white/10 bg-[#24272d] shadow-xl sm:static sm:inset-auto">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4"><h2 className="text-sm font-semibold">{panel === 'chat' ? 'Chat cuộc họp' : panel === 'participants' ? 'Người tham gia' : panel === 'reactions' ? 'Phản ứng' : 'Tùy chọn'}</h2><button aria-label="Đóng bảng" className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10" onClick={() => setPanel('')}><ArrowLeft size={17} /></button></div>
        {panel === 'participants' && <div className="flex-1 overflow-y-auto p-3">{participants.map(person => <div className="flex items-center gap-3 rounded-lg px-2 py-3" key={person.id}><Avatar name={person.initials} size="h-9 w-9" /><span className="min-w-0 flex-1 truncate text-sm">{person.name}{person.id === 'local' ? ' (bạn)' : ''}</span>{person.id === 'local' && <span className="text-xs text-white/50">{micOn ? 'Mic bật' : 'Mic tắt'}</span>}</div>)}<p className="px-2 py-3 text-xs leading-5 text-white/45">Danh sách minh họa cho chế độ offline; người tham gia khác cần signaling/WebRTC để kết nối thực.</p></div>}
        {panel === 'chat' && <><div className="flex-1 space-y-3 overflow-y-auto p-4">{chatMessages.length === 0 && <p className="text-sm text-white/50">Chưa có tin nhắn trong cuộc họp.</p>}{chatMessages.map(message => <div className="rounded-lg bg-white/5 p-3" key={message.id}><p className="text-[11px] text-white/50">Bạn · {message.time}</p><p className="mt-1 break-words text-sm">{message.content}</p></div>)}</div><form className="flex gap-2 border-t border-white/10 p-3" onSubmit={sendMeetingChat}><input className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40" onChange={event => setChatDraft(event.target.value)} placeholder="Nhập tin nhắn" value={chatDraft} /><button aria-label="Gửi tin nhắn cuộc họp" className="grid h-10 w-10 place-items-center rounded-lg bg-brand" disabled={!chatDraft.trim()}><Send size={16} /></button></form></>}
        {panel === 'reactions' && <div className="grid grid-cols-3 gap-2 p-4">{reactions.map(item => <button className="rounded-lg bg-white/5 py-3 text-2xl hover:bg-white/10" key={item} onClick={() => showReaction(item)}>{item}</button>)}</div>}
        {panel === 'options' && <div className="space-y-2 p-4"><button className="meeting-panel-action" onClick={copyInvite}><Copy size={17} />Sao chép liên kết mời</button><button className="meeting-panel-action" onClick={toggleRecording}>{recording ? <Square size={17} /> : <Video size={17} />}{recording ? 'Dừng và tải bản ghi' : 'Ghi lại trên thiết bị'}</button><p className="px-2 pt-2 text-xs leading-5 text-white/45">Bản ghi chỉ thu âm/video từ thiết bị này; không được gửi hoặc lưu trên máy chủ.</p></div>}
      </aside>}
    </div>
    {notice && <div className="fixed bottom-[90px] left-1/2 z-30 -translate-x-1/2 rounded-lg bg-white px-4 py-2.5 text-xs font-medium text-ink shadow-lg">{notice}</div>}
    <footer className="flex h-[82px] shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-[#1d1f2d] px-3 sm:gap-3">
      <button aria-label={micOn ? 'Tắt micro' : 'Bật micro'} className={`meeting-control ${!micOn ? 'bg-white/20' : ''}`} onClick={toggleMic}>{micOn ? <Mic size={19} /> : <MicOff size={19} />}<span className="hidden sm:inline">{micOn ? 'Tắt mic' : 'Bật mic'}</span></button>
      <button aria-label={cameraOn ? 'Tắt camera' : 'Bật camera'} className={`meeting-control ${!cameraOn ? 'bg-white/20' : ''}`} onClick={toggleCamera}>{cameraOn ? <Video size={19} /> : <VideoOff size={19} />}<span className="hidden sm:inline">{cameraOn ? 'Tắt camera' : 'Bật camera'}</span></button>
      <button aria-label={sharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'} className={`meeting-control ${sharing ? 'bg-brand text-white' : ''}`} onClick={shareScreen}><ScreenShare size={19} /><span className="hidden sm:inline">{sharing ? 'Dừng chia sẻ' : 'Chia sẻ'}</span></button>
      <button aria-label="Mở phản ứng" className={`meeting-control ${panel === 'reactions' ? 'bg-white/20' : ''}`} onClick={() => setPanel(panel === 'reactions' ? '' : 'reactions')}><Smile size={19} /><span className="hidden sm:inline">Phản ứng</span></button>
      <button aria-label="Mở chat cuộc họp" className={`meeting-control ${panel === 'chat' ? 'bg-white/20' : ''}`} onClick={() => setPanel(panel === 'chat' ? '' : 'chat')}><MessageCircle size={19} /><span className="hidden sm:inline">Chat</span></button>
      <button aria-label="Tùy chọn và ghi hình" className={`grid h-11 w-11 place-items-center rounded-lg text-white/70 hover:bg-white/10 ${panel === 'options' ? 'bg-white/10 text-white' : ''}`} onClick={() => setPanel(panel === 'options' ? '' : 'options')}><MoreHorizontal size={20} /></button>
      <button aria-label="Rời cuộc họp" className="ml-1 grid h-11 w-[54px] place-items-center rounded-lg bg-[#b94f4f] text-white transition hover:bg-[#a43f3f] sm:w-[100px]" onClick={leaveMeeting}><PhoneOff size={19} /><span className="hidden text-xs font-semibold sm:inline">Rời đi</span></button>
    </footer>
  </main>;
}
