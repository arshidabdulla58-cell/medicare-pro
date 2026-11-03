import { PageIntro } from '../../components/public/PageIntro';
import { DoctorGrid } from '../../components/public/DirectoryGrids';

export function DoctorsPage() {
  return <><PageIntro eyebrow="Our doctors" title="Meet the people behind your care." copy="Browse profiles published by our care team. If you need help choosing a service, send us an enquiry."/><section className="section"><div className="container"><DoctorGrid/></div></section></>;
}
