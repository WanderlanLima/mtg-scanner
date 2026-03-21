import { Link, useLocation } from 'react-router-dom'

export default function NavigationBar() {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end pb-6 px-4 bg-[#0e0e11]/90 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.5)] rounded-t-[0.75rem]">
      <Link to="/" className={`flex flex-col items-center justify-center px-4 py-2 hover:text-[#00cec9] transition-all ${currentPath === '/' ? 'text-[#00cec9]' : 'text-[#474554]'}`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>grid_view</span>
        <span className="font-['Inter'] text-[10px] font-semibold uppercase tracking-tighter">Archive</span>
      </Link>
      <Link to="/scan" className="flex flex-col items-center justify-center bg-gradient-to-br from-[#c6bfff] to-[#6c5ce7] text-white rounded-[0.75rem] px-5 py-2 scale-110 -translate-y-2 transition-all shadow-xl">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>center_focus_strong</span>
        <span className="font-['Inter'] text-[10px] font-semibold uppercase tracking-tighter">Scanner</span>
      </Link>
      <Link to="/market" className={`flex flex-col items-center justify-center px-4 py-2 hover:text-[#00cec9] transition-all ${currentPath === '/market' ? 'text-[#00cec9]' : 'text-[#474554]'}`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>payments</span>
        <span className="font-['Inter'] text-[10px] font-semibold uppercase tracking-tighter">Market</span>
      </Link>
    </nav>
  )
}
