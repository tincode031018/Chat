export default function Avatar({ name = 'U', src, size = 'h-11 w-11', online = false }) {
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full ${size} ${src ? 'bg-slate-100' : 'bg-[#e8edf1]'} text-sm font-semibold text-[#536473]`}>
    {src ? <img alt="" className="h-full w-full object-cover" src={src} /> : name.slice(0, 1).toUpperCase()}
    {online && <i className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#55a27d]" />}
  </span>;
}
