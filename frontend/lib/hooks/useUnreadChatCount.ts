'use client';

import { useEffect, useState, useCallback } from 'react';
import { getUnreadMessageCount } from '@/lib/api/application-messaging';

const STORAGE_KEY = 'donum-chatLastViewedAt';
const POLL_INTERVAL_MS = 30000;

export function useUnreadChatCount(chatPanelOpen: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);

  const markAsRead = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    markAsRead();
  }, [chatPanelOpen, markAsRead]);

  useEffect(() => {
    if (chatPanelOpen) return;
    const lastViewed = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!lastViewed) return;

    const fetchCount = () => {
      getUnreadMessageCount(lastViewed)
        .then(setUnreadCount)
        .catch(() => setUnreadCount(0));
    };

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [chatPanelOpen]);

  return { unreadCount, markAsRead };
}
