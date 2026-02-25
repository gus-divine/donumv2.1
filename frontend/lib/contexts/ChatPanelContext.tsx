'use client';

import * as React from 'react';

const ADMIN_HEADER_HEIGHT = 50;
const DEFAULT_CHAT_WIDTH = 520;
/** Minimum for chat area (300px) + conversations list (180px expanded) */
export const MIN_PANEL_WIDTH = 480;
export const MAX_PANEL_WIDTH = 600;

export interface CurrentApplication {
  applicationId: string;
  applicantName?: string;
}

/** Staff-to-staff DM (no application) */
export interface CurrentStaffDm {
  threadId: string;
  teammateId: string;
  teammateName: string;
}

export type ChatThreadType = 'general' | 'direct';

export interface CurrentChatThread {
  type: ChatThreadType;
  staffId?: string;
  staffName?: string;
}

interface ChatPanelContextType {
  chatPanelOpen: boolean;
  chatPanelWidth: number;
  currentApplication: CurrentApplication | null;
  currentStaffDm: CurrentStaffDm | null;
  currentThread: CurrentChatThread;
  setChatPanelOpen: (open: boolean) => void;
  setChatPanelWidth: (width: number) => void;
  toggleChatPanel: () => void;
  openChatForApplication: (applicationId: string, applicantName?: string) => void;
  setCurrentApplication: (app: CurrentApplication | null) => void;
  setCurrentStaffDm: (dm: CurrentStaffDm | null) => void;
  setCurrentThread: (thread: CurrentChatThread) => void;
  setApplicationContextFromPage: (app: CurrentApplication | null) => void;
}

const ChatPanelContext = React.createContext<ChatPanelContextType | undefined>(undefined);

const STORAGE_KEY = 'donum-chatPanelWidth';

export function ChatPanelProvider({ children }: { children: React.ReactNode }) {
  const [chatPanelOpen, setChatPanelOpenState] = React.useState(false);
  const [chatPanelWidth, setChatPanelWidthState] = React.useState(DEFAULT_CHAT_WIDTH);
  const [currentApplication, setCurrentApplicationState] = React.useState<CurrentApplication | null>(null);
  const [currentStaffDm, setCurrentStaffDmState] = React.useState<CurrentStaffDm | null>(null);
  const [currentThread, setCurrentThreadState] = React.useState<CurrentChatThread>({ type: 'general' });
  const [applicationContextFromPage, setApplicationContextFromPageState] = React.useState<CurrentApplication | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const w = parseInt(saved, 10);
      if (!isNaN(w) && w >= MIN_PANEL_WIDTH && w <= MAX_PANEL_WIDTH) {
        setChatPanelWidthState(w);
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(chatPanelWidth));
  }, [chatPanelWidth]);

  const setChatPanelOpen = React.useCallback((open: boolean) => {
    setChatPanelOpenState(open);
    if (!open) {
      setCurrentApplicationState(null);
      setCurrentStaffDmState(null);
      setCurrentThreadState({ type: 'general' });
    }
  }, []);

  const setChatPanelWidth = React.useCallback((width: number) => {
    const clamped = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, width));
    setChatPanelWidthState(clamped);
  }, []);

  const toggleChatPanel = React.useCallback(() => {
    setChatPanelOpenState((prev) => {
      const next = !prev;
      if (next && applicationContextFromPage) {
        setCurrentApplicationState(applicationContextFromPage);
        setCurrentThreadState({ type: 'general' });
      } else if (!next) {
        setCurrentApplicationState(null);
        setCurrentThreadState({ type: 'general' });
      }
      return next;
    });
  }, [applicationContextFromPage]);

  const openChatForApplication = React.useCallback((applicationId: string, applicantName?: string) => {
    setCurrentApplicationState({ applicationId, applicantName });
    setCurrentThreadState({ type: 'general' });
    setChatPanelOpenState(true);
  }, []);

  const setCurrentApplication = React.useCallback((app: CurrentApplication | null) => {
    setCurrentApplicationState(app);
    setCurrentStaffDmState(null);
    if (app) setCurrentThreadState({ type: 'general' });
  }, []);

  const setCurrentStaffDm = React.useCallback((dm: CurrentStaffDm | null) => {
    setCurrentStaffDmState(dm);
    setCurrentApplicationState(null);
    setCurrentThreadState({ type: 'general' });
  }, []);

  const setCurrentThread = React.useCallback((thread: CurrentChatThread) => {
    setCurrentThreadState(thread);
  }, []);

  const setApplicationContextFromPage = React.useCallback((app: CurrentApplication | null) => {
    setApplicationContextFromPageState(app);
  }, []);

  return (
    <ChatPanelContext.Provider
      value={{
        chatPanelOpen,
        chatPanelWidth,
        currentApplication,
        currentStaffDm,
        currentThread,
        setChatPanelOpen,
        setChatPanelWidth,
        toggleChatPanel,
        openChatForApplication,
        setCurrentApplication,
        setCurrentStaffDm,
        setCurrentThread,
        setApplicationContextFromPage,
      }}
    >
      {children}
    </ChatPanelContext.Provider>
  );
}

export function useChatPanel() {
  const ctx = React.useContext(ChatPanelContext);
  if (ctx === undefined) {
    throw new Error('useChatPanel must be used within ChatPanelProvider');
  }
  return ctx;
}

export { ADMIN_HEADER_HEIGHT };
