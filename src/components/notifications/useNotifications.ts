import { useCallback, useEffect, useState } from 'react'
import { notificationsV3, type Notification } from '../../api/v3/platform'
import { tokenStorage } from '../../api/tokenStorage'

/**
 * Real notification bell data: unread count + latest items.
 * Polls every 45s while signed in. No push in v3.
 */
export function useNotificationsPolling(enabled: boolean, pollMs = 45000) {
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) return
    setLoading(true)
    try {
      const [count, list] = await Promise.all([
        notificationsV3.unreadCount(),
        notificationsV3.list({ page: 1, pageSize: 10 }),
      ])
      setUnread(count)
      setItems(list.items)
    } catch {
      /* bell stays silent on failure — the page shows the error state */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()
    const id = window.setInterval(refresh, pollMs)
    return () => window.clearInterval(id)
  }, [enabled, pollMs, refresh])

  const markRead = useCallback(async (id: string) => {
    const updated = await notificationsV3.markRead(id)
    setItems((prev) => prev.map((n) => (n.id === id ? updated : n)))
    setUnread((u) => Math.max(0, u - 1))
  }, [])

  return { unread, items, loading, refresh, markRead }
}
