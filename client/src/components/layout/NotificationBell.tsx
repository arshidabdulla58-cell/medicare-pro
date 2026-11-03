import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { apiHttp } from '../../features/auth/auth-api';
import { useAuthStore } from '../../features/auth/auth-store';

type Inbox = { items: Array<{ _id: string; message: string; readAt: string | null; createdAt: string }>; unread: number; total: number };
export function NotificationBell() {
  const { user, accessToken } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const cache = useQueryClient();
  const queryKey = ['notifications', user?.id, page];
  const inbox = useQuery({ queryKey, queryFn: async () => (await apiHttp.get<{ data: Inbox }>('/notifications', { params: { page } })).data.data, enabled: Boolean(user), refetchInterval: 30_000 });
  const mark = useMutation({ mutationFn: (id: string) => apiHttp.post(`/notifications/${id}/read`), onSuccess: () => { void cache.invalidateQueries({ queryKey: ['notifications', user?.id] }); } });
  useEffect(() => {
    if (!accessToken || !user) return;
    const socket = io({ auth: { token: accessToken } });
    const refresh = () => { void cache.invalidateQueries({ queryKey: ['notifications', user.id] }); void cache.invalidateQueries({ queryKey: ['appointments'] }); };
    socket.on('connect', refresh);
    socket.on('notification.created', refresh);
    return () => { socket.disconnect(); cache.removeQueries({ queryKey: ['notifications', user.id] }); };
  }, [accessToken, user, cache]);
  return <div className="relative"><button aria-label={`Notifications${inbox.data ? `, ${inbox.data.unread} unread` : ''}`} aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-xl p-2 text-teal-800"><Bell size={20}/>{Boolean(inbox.data?.unread) && <span className="rounded-full bg-teal-700 px-1.5 text-xs text-white">{inbox.data?.unread}</span>}</button>{open && <section aria-label="Notifications" className="absolute right-0 top-12 z-50 max-h-[70vh] w-[min(320px,85vw)] overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}><div className="flex justify-between"><h2 className="font-semibold">Notifications</h2><button onClick={() => setOpen(false)} aria-label="Close notifications">×</button></div>{inbox.isLoading ? <p role="status">Loading…</p> : inbox.isError ? <button onClick={() => void inbox.refetch()}>Could not load notifications. Retry</button> : <><ul>{inbox.data?.items.map((item) => <li className="border-b border-slate-100 py-3 text-sm" key={item._id}><p>{item.message}</p><time className="block py-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time>{!item.readAt && <button disabled={mark.isPending} onClick={() => mark.mutate(item._id)} className="font-semibold text-teal-700">Mark as read</button>}</li>)}</ul>{!inbox.data?.total && <p className="py-4 text-sm">No notifications yet.</p>}<div className="flex justify-between py-3 text-xs"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button disabled={!inbox.data || page * 10 >= inbox.data.total} onClick={() => setPage(page + 1)}>Next</button></div></>}{mark.isError && <p role="alert" className="text-sm text-red-700">Could not mark as read. Try again.</p>}<Link to="/my-appointments" onClick={() => setOpen(false)} className="text-sm font-semibold text-teal-700">View appointments</Link></section>}</div>;
}
