import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  return <section className="container grid min-h-[55vh] place-items-center py-16 text-center"><div><span className="eyebrow">Page not found</span><h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">This page isn't here.</h1><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">The address may have changed. Head back to the MediCare Pro homepage to find your way.</p><Button asChild className="mt-6"><Link to="/">Go to homepage</Link></Button></div></section>;
}
