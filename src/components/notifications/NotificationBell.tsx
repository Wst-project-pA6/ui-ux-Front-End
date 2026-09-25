import { useEffect, useState } from 'react'
import { useNotificationsPolling } from './useNotifications'
import { tokenStorage } from '../../api/tokenStorage'

export function NotificationBell({ onOpen }: { onOpen?: () => void }) {
  const signedIn = !!tokenStorage.getAccessToken()
  const { unread, items, refresh } = useNotificationsPolling(signedIn, 45000)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); onOpen?.() }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors relative"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 end-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2 max-h-96 overflow-y-auto">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <a href="/notifications" className="text-xs text-blue-600 font-medium">View all</a>
            </div>
            {items.length === 0 && <p className="px-4 py-6 text-xs text-slate-400 text-center">No notifications.</p>}
            {items.map((n) => (
              <div key={n.id} className="px-4 py-3 hover:bg-slate-50 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.readAt ? 'bg-slate-200' : 'bg-blue-500'}`} />
                <div className="min-w-0">
                  <p className={`text-sm ${n.readAt ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>{n.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.eventType} · {n.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
