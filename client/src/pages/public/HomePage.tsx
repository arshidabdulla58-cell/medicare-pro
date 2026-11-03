import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, CalendarDays, Check, ChevronRight, HeartHandshake, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { DepartmentGrid, DoctorGrid } from '../../components/public/DirectoryGrids';

const values = [
  { icon: HeartHandshake, title: 'Care that listens', copy: 'Every question deserves time, clear answers, and a plan you understand.' },
  { icon: ShieldCheck, title: 'Your privacy matters', copy: 'Personal health information deserves careful handling and respectful access.' },
  { icon: Stethoscope, title: 'Teams working together', copy: 'Connected care helps people move through each next step with confidence.' },
];

export function HomePage() {
  const reduceMotion = useReducedMotion();
  return <>
    <section className="relative overflow-hidden bg-[linear-gradient(115deg,#f7fbfa_0%,#eff8f6_62%,#e6f4f1_100%)]"><div className="pointer-events-none absolute -right-24 top-0 size-[520px] rounded-full border border-teal-800/5" /><div className="pointer-events-none absolute -right-5 top-14 size-[390px] rounded-full border border-teal-800/5" />
      <div className="container grid min-h-[600px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
          <span className="eyebrow"><Sparkles size={14} /> Care, with clarity</span>
          <h1 className="mt-6 max-w-2xl text-[clamp(46px,6.3vw,76px)] font-semibold leading-[1.02] tracking-[-.065em] text-slate-900">A healthier path, <span className="text-teal-700">together.</span></h1>
          <p className="mt-6 max-w-xl text-[17px] leading-8 text-slate-600">Find the information you need, connect with a care team, and take your next step with confidence.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="large"><Link to="/contact?topic=APPOINTMENT#contact-form">Request an appointment <ArrowRight size={17} /></Link></Button><Button asChild size="large" variant="secondary"><Link to="/departments">Explore departments</Link></Button></div>
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><Check size={16} className="text-teal-700" /> A real person from our team will follow up on your request.</div>
        </motion.div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7, delay: .08 }} className="relative mx-auto w-full max-w-[480px]">
          <div className="relative aspect-[.94] overflow-hidden rounded-[36px] border border-white/80 bg-[radial-gradient(ellipse_at_50%_30%,#d5eee8_0%,#b7ded9_42%,#a0cbc9_100%)] shadow-[0_35px_90px_rgba(19,77,81,.18)]">
            <div className="absolute left-[10%] top-[14%] size-28 rounded-full bg-white/25 blur-2xl" /><div className="absolute bottom-0 left-0 h-[27%] w-full bg-[linear-gradient(0deg,#88bcb7,transparent)]" />
            <div className="absolute left-1/2 top-[12%] h-[66%] w-[56%] -translate-x-1/2 rounded-t-[48%] bg-[linear-gradient(115deg,#f4fbfa,#cde8e2)] shadow-[inset_-16px_0_25px_rgba(40,120,116,.1)]" />
            <div className="absolute left-1/2 top-[18%] h-[25%] w-[26%] -translate-x-1/2 rounded-[46%_46%_42%_42%] bg-[linear-gradient(120deg,#d19b79,#ad715b)] shadow-[inset_-8px_-5px_12px_rgba(72,45,39,.12)]" />
            <div className="absolute left-[32%] top-[14%] h-[16%] w-[36%] rounded-t-full bg-[#243d46]" />
            <div className="absolute left-1/2 top-[45%] h-[9%] w-[11%] -translate-x-1/2 rounded-b-full border-b-2 border-teal-900/35" />
            <div className="absolute left-[47%] top-[46%] size-2 rounded-full bg-slate-700/70 shadow-[20px_0_0_rgba(51,65,85,.7)]" />
            <div className="absolute left-[25%] top-[44%] h-[28%] w-[50%] rotate-[-12deg] rounded-[35%] border-[9px] border-white/90 bg-transparent" />
            <div className="absolute left-[39%] top-[49%] h-[27%] w-[22%] rounded-t-[42%] bg-[linear-gradient(135deg,#fdfefe,#d7eae6)]" />
            <div className="absolute left-[7%] top-[60%] h-[26%] w-[39%] -rotate-12 rounded-[45%_20%_30%_40%] bg-[linear-gradient(130deg,#e8f3ef,#fff)] shadow-xl" />
            <div className="absolute right-[9%] top-[57%] h-[30%] w-[40%] rotate-[12deg] rounded-[20%_44%_40%_28%] bg-[linear-gradient(140deg,#d8eeea,#fff)] shadow-xl" />
            <div className="absolute bottom-[13%] left-[12%] grid size-[72px] place-items-center rounded-[22px] border border-white/70 bg-white/85 text-teal-700 shadow-lg backdrop-blur"><HeartHandshake size={31} /></div>
            <div className="absolute bottom-[14%] right-[8%] max-w-[190px] rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-lg backdrop-blur"><span className="text-xs font-semibold text-teal-800">Here for your next step</span><span className="mt-1 block text-[11px] leading-5 text-slate-500">Questions, appointments, and care information in one place.</span></div>
          </div>
          <div className="absolute -left-5 top-[19%] grid size-12 place-items-center rounded-2xl border border-white bg-white text-teal-700 shadow-lg"><HeartHandshake size={22} /></div>
          <div className="absolute -right-4 top-[35%] grid size-12 place-items-center rounded-2xl border border-white bg-white text-teal-700 shadow-lg"><ShieldCheck size={22} /></div>
        </motion.div>
      </div>
      <a href="#departments" className="container mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-slate-500"><ArrowDown size={15} /> Explore care</a>
    </section>

    <section id="departments" className="section"><div className="container"><div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><span className="eyebrow">Care, connected</span><h2 className="section-heading">Find the support that fits.</h2><p className="section-copy">Explore our departments and learn how to reach the right team.</p></div><Link className="inline-flex items-center gap-2 pb-2 text-sm font-semibold text-teal-800" to="/departments">All departments <ChevronRight size={16} /></Link></div><DepartmentGrid limit={3} /></div></section>

    <section className="section section-soft"><div className="container grid items-center gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><span className="eyebrow">A little more human</span><h2 className="section-heading">Good care starts with being heard.</h2><p className="section-copy">Your health journey is personal. We aim to make every interaction clear, respectful, and easier to navigate.</p><Button asChild className="mt-7" variant="secondary"><Link to="/about">Get to know us <ArrowRight size={16} /></Link></Button></div><div className="grid gap-4 sm:grid-cols-3">{values.map(({ icon: Icon, title, copy }) => <article className="surface-card p-5" key={title}><div className="icon-box"><Icon size={22} /></div><h3 className="mt-5 font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></article>)}</div></div></section>

    <section className="section"><div className="container"><div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><span className="eyebrow">Meet your care team</span><h2 className="section-heading">People here to help.</h2><p className="section-copy">Browse profiles and areas of practice from our published directory.</p></div><Link className="inline-flex items-center gap-2 pb-2 text-sm font-semibold text-teal-800" to="/doctors">Meet the doctors <ChevronRight size={16} /></Link></div><DoctorGrid limit={3} /></div></section>

    <section className="pb-24"><div className="container"><div className="relative overflow-hidden rounded-[28px] bg-[#123d48] px-7 py-10 text-white sm:px-12 sm:py-14"><div className="absolute -right-10 -top-36 size-[360px] rounded-full border border-white/10" /><div className="absolute -right-2 -top-24 size-[260px] rounded-full border border-white/10" /><div className="relative max-w-2xl"><span className="text-xs font-semibold uppercase tracking-[.14em] text-teal-200">We can help you take the next step</span><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Have a question about care?</h2><p className="mt-4 max-w-xl text-sm leading-7 text-teal-50/75">Send a message to our team. Appointment requests are reviewed and confirmed by a staff member.</p><Button asChild className="mt-7" variant="secondary"><Link to="/contact?topic=APPOINTMENT#contact-form"><CalendarDays size={16} /> Request an appointment</Link></Button></div></div></div></section>
  </>;
}
