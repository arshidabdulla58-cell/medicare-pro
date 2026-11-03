import { ArrowRight, CalendarClock, ClipboardList, HeartPulse, MessagesSquare, ShieldPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { PageIntro } from '../../components/public/PageIntro';

const services = [
  { icon: HeartPulse, title: 'Care coordination', text: 'Get help connecting with the right department and understanding what to expect next.' },
  { icon: CalendarClock, title: 'Appointment support', text: 'Send a request and a staff member will follow up to confirm availability.' },
  { icon: ClipboardList, title: 'Patient information', text: 'Learn how to prepare for a visit and what information may be useful to bring.' },
  { icon: MessagesSquare, title: 'Questions and follow-up', text: 'Reach out when you need clarification about navigating your care.' },
  { icon: ShieldPlus, title: 'Privacy-minded support', text: 'We aim to handle personal information with care and limit it to what is needed.' },
];

export function ServicesPage() {
  return <><PageIntro eyebrow="Services" title="Support that helps care feel connected." copy="Our team can help you understand available services, make an appointment request, and find the right point of contact."/><section className="section"><div className="container"><div className="grid-3">{services.map(({ icon: Icon, title, text })=><article className="surface-card p-6" key={title}><div className="icon-box"><Icon size={22}/></div><h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></article>)}</div><div className="mt-10 rounded-3xl bg-[#123d48] p-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10"><div><h2 className="text-2xl font-semibold tracking-tight">Need help finding the right service?</h2><p className="mt-2 text-sm leading-6 text-teal-50/75">Send us a message. A member of our team will get back to you.</p></div><Button asChild className="mt-6 shrink-0 sm:mt-0" variant="secondary"><Link to="/contact">Contact us <ArrowRight size={16}/></Link></Button></div></div></section></>;
}
