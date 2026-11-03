export function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="border-b border-slate-200 bg-[radial-gradient(ellipse_at_75%_0%,#dff3ee_0%,transparent_38%),linear-gradient(180deg,#fff,#f7fafb)] py-16 sm:py-20"><div className="container"><span className="eyebrow">{eyebrow}</span><h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.05em] text-slate-900 sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">{copy}</p></div></section>;
}
