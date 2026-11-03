import { PageIntro } from '../../components/public/PageIntro';
import { DepartmentGrid } from '../../components/public/DirectoryGrids';

export function DepartmentsPage() {
  return <><PageIntro eyebrow="Departments" title="Care for every part of your health." copy="Explore our published departments and connect with the team that can help you find the right next step."/><section className="section"><div className="container"><DepartmentGrid/></div></section></>;
}
