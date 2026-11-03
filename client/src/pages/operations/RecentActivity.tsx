import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { operationsApi } from '../../features/operations/operations-api';
import { Button } from '../../components/ui/Button';

const readable = (value: string) => value.toLowerCase().replaceAll('_', ' ');

export function RecentActivity() {
  const [page, setPage] = useState(1);
  const activity = useQuery({ queryKey: ['analytics', 'activity', page], queryFn: () => operationsApi.activity(page), refetchInterval: 60_000 });
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Recent activity">
    <h3 className="font-semibold text-slate-900">Recent activity</h3>
    <p className="mt-1 text-xs text-slate-500">Recorded events across your hospital</p>
    {activity.isLoading ? <p role="status" className="py-6 text-sm text-slate-500">Loading activity…</p> : activity.isError ? <div role="alert" className="py-4 text-sm text-rose-700">Activity could not be loaded. <Button variant="secondary" size="small" onClick={() => void activity.refetch()}>Retry</Button></div> : activity.data?.items.length ? <ul className="mt-4 divide-y divide-slate-100">{activity.data.items.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-3"><div><p className="text-sm font-medium capitalize text-slate-800">{readable(event.action)}</p><p className="mt-1 text-xs capitalize text-slate-500">{readable(event.resourceType)}</p></div><time dateTime={event.timestamp} className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</time></li>)}</ul> : <p className="py-6 text-sm text-slate-500">No activity has been recorded yet.</p>}
    <div className="mt-3 flex items-center justify-between gap-3"><Button size="small" variant="secondary" disabled={page === 1 || activity.isFetching} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-xs text-slate-500">Page {page}</span><Button size="small" variant="secondary" disabled={!activity.data || page * activity.data.limit >= activity.data.total || activity.isFetching} onClick={() => setPage(page + 1)}>Next</Button></div>
  </section>;
}
