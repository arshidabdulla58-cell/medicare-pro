import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { cloneElement, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { contactSchema, type ContactFormValues } from '../../features/contact/contact-schema';
import { publicApi } from '../../services/public-api';
import { Button } from '../../components/ui/Button';
import { PageIntro } from '../../components/public/PageIntro';

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const topic = searchParams.get('topic');
  const defaultTopic = topic === 'APPOINTMENT' || topic === 'FEEDBACK' ? topic : 'GENERAL';
  const form = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema), defaultValues: { name: '', email: '', phone: '', topic: defaultTopic, message: '' } });
  const mutation = useMutation({ mutationFn: publicApi.submitContact });

  const onSubmit = form.handleSubmit((values) => {
    mutation.reset();
    mutation.mutate(values, { onSuccess: () => form.reset({ name: '', email: '', phone: '', topic: defaultTopic, message: '' }) });
  });

  return <><PageIntro eyebrow="Contact us" title="We're here to help you find your next step." copy="Send a message to our team. For appointment requests, a staff member will contact you to confirm availability."/>
    <section className="section"><div className="container grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
      <aside className="rounded-[24px] bg-[#123d48] p-7 text-white sm:p-8"><span className="text-xs font-semibold uppercase tracking-[.14em] text-teal-200">Get in touch</span><h2 className="mt-3 text-2xl font-semibold tracking-tight">A real person is ready to listen.</h2><p className="mt-3 text-sm leading-7 text-teal-50/75">Use the form to tell us what you need. Please do not include sensitive medical details here.</p>
        <div className="mt-8 grid gap-5 border-t border-white/15 pt-6">
          <ContactInfo icon={Mail} title="Email" text="arshidabdulla58@gmail.com" href="mailto:arshidabdulla58@gmail.com" />
          <ContactInfo icon={Phone} title="Phone" text="+91 70129 38103" href="tel:+917012938103" />
          <ContactInfo icon={MessageCircle} title="WhatsApp" text="Chat with us at +91 70129 38103" href="https://wa.me/917012938103" external />
          <ContactInfo icon={MapPin} title="Visit" text="Please contact us for location information"/>
          <ContactInfo icon={Clock3} title="Response time" text="Our team will follow up during business hours"/>
        </div>
      </aside>
      <div id="contact-form" className="surface-card p-6 sm:p-9"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-900">Send us a message</h2><p className="mt-2 text-sm leading-6 text-slate-600">Required fields are marked. Please keep your message general.</p></div>
        {mutation.isSuccess ? <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" role="status"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={21}/><div><h3 className="font-semibold text-emerald-950">Your message has been received</h3><p className="mt-1 text-sm leading-6 text-emerald-900">Reference <strong>{mutation.data.reference}</strong>. Our team will follow up. A request is not a confirmed appointment.</p></div></div></div> : null}
        {mutation.isError ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">We couldn't send your message. Please check your connection and try again.</p> : null}
        <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={onSubmit} noValidate>
          <Field label="Your name" error={form.formState.errors.name?.message}><input className="form-control" autoComplete="name" {...form.register('name')} aria-invalid={Boolean(form.formState.errors.name)} /></Field>
          <Field label="Email address" error={form.formState.errors.email?.message}><input className="form-control" type="email" autoComplete="email" {...form.register('email')} aria-invalid={Boolean(form.formState.errors.email)} /></Field>
          <Field label="Phone (optional)" error={form.formState.errors.phone?.message}><input className="form-control" type="tel" autoComplete="tel" {...form.register('phone')} aria-invalid={Boolean(form.formState.errors.phone)} /></Field>
          <Field label="What can we help with?" error={form.formState.errors.topic?.message}><select className="form-control" {...form.register('topic')}><option value="GENERAL">General enquiry</option><option value="APPOINTMENT">Appointment request</option><option value="FEEDBACK">Feedback</option></select></Field>
          <div className="sm:col-span-2"><Field label="Message" error={form.formState.errors.message?.message}><textarea className="form-control min-h-32 resize-y" maxLength={2000} placeholder="Tell us what you need help with. Please don't include private health information." {...form.register('message')} aria-invalid={Boolean(form.formState.errors.message)} /></Field></div>
          <div className="sm:col-span-2"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Sending…' : 'Send message'}</Button><p className="mt-3 text-xs leading-5 text-slate-500">Do not use this form for emergencies or urgent medical advice.</p></div>
        </form>
      </div>
    </div></section>
  </>;
}

function Field({ label, error, children }: { label: string; error: string | undefined; children: ReactElement; }) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const fieldProps = { id, ...(error ? { 'aria-describedby': `${id}-error` } : {}) };
  return <div><label htmlFor={id} className="form-label">{label}</label>{cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, fieldProps)}{error ? <p id={`${id}-error`} className="form-error">{error}</p> : null}</div>;
}

function ContactInfo({ icon: Icon, title, text, href, external = false }: { icon: LucideIcon; title: string; text: string; href?: string; external?: boolean }) {
  return <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-teal-100"><Icon size={17}/></span><div><h3 className="text-sm font-semibold">{title}</h3>{href ? <a className="mt-1 inline-block text-xs leading-5 text-teal-50/80 underline decoration-white/25 underline-offset-4 hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200" href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{text}</a> : <p className="mt-1 text-xs leading-5 text-teal-50/70">{text}</p>}</div></div>;
}
