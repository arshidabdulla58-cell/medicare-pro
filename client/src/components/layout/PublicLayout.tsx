import { useState } from 'react';
import { HeartPulse, Menu, MoveUpRight, X } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Button } from '../ui/Button';
import { authApi } from '../../features/auth/auth-api';
import { useAuthStore } from '../../features/auth/auth-store';
import { NotificationBell } from './NotificationBell';

const links: Array<[string, string]> = [['About', '/about'], ['Departments', '/departments'], ['Our doctors', '/doctors'], ['Services', '/services']];

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const signOut = async () => {
    setSignOutError(false);
    try {
      await authApi.logout();
      clearSession();
    } catch {
      setSignOutError(true);
    }
  };
  return <>
    <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3" href="#main">Skip to content</a>
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="container flex h-[76px] items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="MediCare Pro home" onClick={() => setMenuOpen(false)}><span className="grid size-10 place-items-center rounded-[14px] bg-teal-700 text-white"><HeartPulse size={22} /></span><span className="leading-tight"><span className="block text-[17px] font-bold tracking-[-.04em] text-slate-900">MediCare<span className="text-teal-700"> Pro</span></span><span className="mt-0.5 block text-[10px] font-semibold tracking-[.16em] text-slate-400">CARE, WITH CLARITY</span></span></Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">{links.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `text-[13px] font-medium transition hover:text-teal-700 ${isActive ? 'text-teal-800' : 'text-slate-600'}`}>{label}</NavLink>)}</nav>
        {user?.role === 'PATIENT' && <NotificationBell key={user.id} />}
        <div className="hidden items-center gap-2 md:flex">{user ? <><span className="text-xs font-medium text-slate-600">Hi, {user.firstName}</span>{user.role === 'PATIENT' && <Button asChild size="small" variant="ghost"><Link to="/my-appointments">My appointments</Link></Button>}{['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(user.role) && <Button asChild size="small" variant="ghost"><Link to="/workspace">Workspace</Link></Button>}<Button size="small" variant="ghost" onClick={() => void signOut()}>Sign out</Button></> : <Button asChild size="small" variant="ghost"><Link to="/login">Sign in</Link></Button>}<Button asChild size="small"><Link to="/contact?topic=APPOINTMENT#contact-form">Request an appointment <MoveUpRight size={15} /></Link></Button></div>
        <button className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 md:hidden" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {menuOpen && <nav id="mobile-navigation" className="border-t border-slate-100 bg-white px-5 py-4 md:hidden" aria-label="Mobile navigation">{links.map(([label, to]) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-teal-50">{label}</NavLink>)}{user ? <>{user.role === 'PATIENT' && <NavLink to="/my-appointments" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">My appointments</NavLink>}{['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(user.role) && <NavLink to="/workspace" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">Staff workspace</NavLink>}<button className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-teal-50" onClick={() => { setMenuOpen(false); void signOut(); }}>Sign out ({user.firstName})</button></> : <NavLink to="/login" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-teal-50">Sign in</NavLink>}<Button asChild className="mt-2 w-full"><Link to="/contact?topic=APPOINTMENT#contact-form" onClick={() => setMenuOpen(false)}>Request an appointment</Link></Button></nav>}
    </header>
      {signOutError ? <p className="bg-red-50 px-4 py-2 text-center text-xs text-red-800" role="alert">We couldn't end your session. Check your connection and try again.</p> : null}
    <main id="main"><Outlet /></main>
    <footer className="border-t border-slate-200 bg-white"><div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
      <div><Link to="/" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[14px] bg-teal-700 text-white"><HeartPulse size={21} /></span><span className="text-lg font-bold tracking-tight text-slate-900">MediCare<span className="text-teal-700"> Pro</span></span></Link><p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">Thoughtful care starts with clear information, coordinated teams, and a welcoming place to ask for help.</p></div>
      <div><h2 className="text-sm font-semibold text-slate-900">Explore</h2><div className="mt-4 grid gap-3">{links.map(([label, to]) => <Link key={to} className="text-sm text-slate-500 hover:text-teal-700" to={to}>{label}</Link>)}<Link className="text-sm text-slate-500 hover:text-teal-700" to="/contact">Contact us</Link></div></div>
      <div><h2 className="text-sm font-semibold text-slate-900">Get in touch</h2><p className="mt-4 text-sm leading-6 text-slate-500">For care enquiries or appointment requests, send a message and our team will follow up.</p><div className="mt-3 grid justify-items-start gap-2"><a className="text-sm text-slate-600 hover:text-teal-700" href="mailto:arshidabdulla58@gmail.com">arshidabdulla58@gmail.com</a><a className="text-sm text-slate-600 hover:text-teal-700" href="https://wa.me/917012938103" target="_blank" rel="noopener noreferrer">WhatsApp: +91 70129 38103</a><Link className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800" to="/contact">Send an enquiry <MoveUpRight size={14} /></Link></div></div>
    </div><div className="border-t border-slate-100"><div className="container flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} MediCare Pro</span><span>For emergencies, contact your local emergency services.</span></div></div></footer>
  </>;
}
