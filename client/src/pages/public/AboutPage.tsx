import { ArrowRight, HandHeart, MessagesSquare, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { PageIntro } from '../../components/public/PageIntro';

const principles = [
  { icon: HandHeart, title: 'Start with empathy', text: 'Make room for every person’s questions, priorities, and lived experience.' },
  { icon: MessagesSquare, title: 'Make care understandable', text: 'Share information in plain language and explain what happens next.' },
  { icon: ShieldCheck, title: 'Respect privacy', text: 'Treat health information with discretion and use it only for appropriate care.' },
  { icon: UsersRound, title: 'Work as one team', text: 'Help patients and care professionals stay connected through each transition.' },
];

export function AboutPage() {
  return <>
    <PageIntro eyebrow="About MediCare Pro" title="Care works better when people feel seen." copy="We believe a good care experience combines thoughtful people, clear information, and coordinated next steps." />
    <section className="section"><div className="container grid items-center gap-12 lg:grid-cols-2"><div><span className="eyebrow">Our approach</span><h2 className="section-heading">Healthcare should feel easier to navigate.</h2><p className="section-copy">MediCare Pro is designed around the moments that matter: finding the right service, preparing for an appointment, understanding a care plan, and knowing how to get help.</p><p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">Our teams work to keep communication clear and care respectful at every step. We continue to learn from patients and the people who support them.</p><Button asChild className="mt-7"><Link to="/contact">Talk with our team <ArrowRight size={16} /></Link></Button></div><div className="relative min-h-[340px] overflow-hidden rounded-[28px] bg-[radial-gradient(ellipse_at_40%_30%,#fff_0%,transparent_25%),linear-gradient(140deg,#e4f5f1,#b6ddd8)] p-7"><div className="absolute right-[12%] top-[12%] size-48 rounded-full border border-teal-900/10"/><div className="absolute right-[20%] top-[21%] size-32 rounded-full border border-teal-900/10"/><div className="absolute bottom-0 left-0 h-[25%] w-full bg-gradient-to-t from-[#92c8c1] to-transparent"/><div className="absolute bottom-[12%] left-[9%] max-w-xs rounded-2xl border border-white/80 bg-white/90 p-5 shadow-xl"><span className="text-xs font-bold uppercase tracking-widest text-teal-800">Our promise</span><p className="mt-2 text-lg font-semibold leading-7 tracking-tight text-slate-900">Clear answers. Thoughtful care. A next step you can see.</p></div><div className="absolute right-[12%] top-[18%] grid size-20 place-items-center rounded-[26px] bg-white/80 text-teal-800 shadow-lg"><HandHeart size={36}/></div></div></div></section>
    <section className="section section-soft"><div className="container"><span className="eyebrow">What guides us</span><h2 className="section-heading">The way we want every interaction to feel.</h2><div className="mt-9 grid-2">{principles.map(({ icon: Icon, title, text }) => <article className="surface-card flex gap-5 p-6 sm:p-7" key={title}><div className="icon-box shrink-0"><Icon size={22}/></div><div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></div></article>)}</div></div></section>
  </>;
}
