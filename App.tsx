import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SessionGuard } from './components/SessionGuard';
import { PinboardLane } from './components/PinboardLane';
import { DemoTab } from './components/DemoTab';
import { SettingsTab } from './components/SettingsTab';
import { SearchInput } from './components/SearchInput';
import { ToastProvider, useToast } from './components/Toast';
import { useUI } from './src/context/UIContext';
import { db } from './services/db';
import { loadDefaultNote, saveDefaultNoteToCloud, sendPresenceHeartbeat, getUserPresence, loadUserProjects, saveUserProjects, getTab1Data } from './services/db';
import { userRegistry, hydrateRegistryFromCloud } from './services/userRegistry';
import { supabaseAuth } from './services/auth';
import { supabase } from './services/supabaseClient';
import { resolveMetadata } from './services/metadata';
import { loadWorkspacesForOwner, loadBoardsForWorkspace, loadBoardsForUser } from './services/boardService';
import type { Workspace, Board } from './services/boardService';
import { logBoardActivity } from './services/activityService';
import { ClipboardItem, UserEmail, ItemType, TaskStatus, EnrichmentStatus, UserSession, Theme, UserProject } from './types';
import { OWNER_EMAIL } from './constants';
import { Plus, Calendar, MapPin, Youtube, Globe, FileText, CheckSquare, Rocket, UserPlus, Trash2, FileArchive, Upload, Loader2, Image as ImageIcon, Video as VideoIcon, X, Users, LayoutGrid, LayoutList, Grid3X3, RotateCcw, FolderPlus, Search, ArrowUp, Pencil } from 'lucide-react';
import { uploadDocument, formatFileSize, getFileIcon, ACCEPTED_EXTENSIONS } from './services/documentService';
import { uploadMedia, ACCEPTED_IMAGE_EXTENSIONS, ACCEPTED_VIDEO_EXTENSIONS } from './services/mediaService';
import { ThemeDock } from './components/ThemeDock';
import { ChatWindow } from './components/ChatWindow';
import { OwnerCommsHub } from './components/OwnerCommsHub';
import { AppHeader } from './components/AppHeader';
import { TelemetryStrip } from './components/TelemetryStrip';
import { ProtocolBanner } from './components/ProtocolBanner';
import { ContextBar } from './components/ContextBar';
import { ConsoleGrid } from './components/ConsoleGrid';
import { ControlTower } from './components/ControlTower';
import { ActivityTicker } from './components/ActivityTicker';
import AdminSearchOverlay from './components/AdminSearchOverlay';

const THEME_BACKGROUNDS: Record<Theme, string> = {
  [Theme.NEON]:     'Media/NEON.jpg',
  [Theme.MIDNIGHT]: 'Media/MIDNIGHT.jpg',
  [Theme.PAPER]:    'Media/PAPER.jpg',
  [Theme.SAND]:     'Media/SAND.jpg',
  [Theme.OCEAN]:    'Media/OCEAN.jpg',
  [Theme.CARBON]:   'Media/background.jpg',
};

const DEFAULT_NOTE_KEY = 'jb3_default_note_all';

const DEMO_TAB_ID = '__DEMO__';
const SETTINGS_TAB_ID = '__SETTINGS__';

const getChatAnchorId = (userId: string) => `${userId}_CHAT`;
const isChatAnchor = (id: string | null) => typeof id === 'string' && id.endsWith('_CHAT');

/** Returns true when projectId is null, undefined, or the V1 placeholder 'default' */
const isLegacyProjectId = (pid: string | undefined) => !pid || pid === 'default';

const AppInner: React.FC = () => {
  const [activeTab, setActiveTabRaw] = useState<string>('JONO');
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ClipboardItem | null>(null);
  const [defaultNote, setDefaultNote] = useState('');
  const [tabsVersion, setTabsVersion] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const { showToast } = useToast();

  const [newItemType, setNewItemType] = useState<ItemType>(ItemType.NOTE);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemIsDemo, setNewItemIsDemo] = useState(false);
  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedTargetUsers, setSelectedTargetUsers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid-big' | 'grid-small' | 'list'>(() => window.innerWidth < 768 ? 'list' : 'grid-big');
  const [showAES, setShowAES] = useState(false);
  const [showThemeDock, setShowThemeDock] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [shareItem, setShareItem] = useState<ClipboardItem | null>(null);
  const [shareTargetUsers, setShareTargetUsers] = useState<string[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [userProjectsMap, setUserProjectsMap] = useState<Record<string, UserProject[]>>({});
  const [showAdminSearch, setShowAdminSearch] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [newItemTargetProjectId, setNewItemTargetProjectId] = useState<string | null>(null);
  const [editCopyToUsers, setEditCopyToUsers] = useState<string[]>([]);
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTabTargetUserId, setNewTabTargetUserId] = useState<string>('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string>('');
  const [renameProjectUserId, setRenameProjectUserId] = useState<string>('');
  const [renameLabel, setRenameLabel] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ─── Board/Workspace state ───
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  const { theme } = useUI();
  const bgImage = `${import.meta.env.BASE_URL}${THEME_BACKGROUNDS[theme] ?? 'Media/NEON.jpg'}`;

  // ─── History-aware tab navigation ───
  // Wrap setActiveTab to push browser history state so Back navigates within the app.
  const historyInitRef = useRef(false);
  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabRaw(prev => {
      if (prev !== tabId) {
        history.pushState({ tab: tabId }, '', undefined);
      }
      return tabId;
    });
  }, []);

  // Seed initial history entry and listen for popstate
  useEffect(() => {
    if (!historyInitRef.current) {
      history.replaceState({ tab: 'JONO' }, '', undefined);
      historyInitRef.current = true;
    }
    const onPopState = (e: PopStateEvent) => {
      if (e.state?.tab) {
        setActiveTabRaw(e.state.tab);
      } else {
        // No more app history — re-push current state to stay in /clipboard
        history.pushState({ tab: 'JONO' }, '', undefined);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ─── Scroll-to-top visibility ───
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getCurrentSession = (): UserSession => {
    const saved = localStorage.getItem('jb3_session');
    if (!saved) return { email: OWNER_EMAIL, pinVerified: true };
    const parsed = JSON.parse(saved);
    return {
      email: parsed.email,
      pinVerified: parsed.pinVerified ?? true,
      trustUntil: parsed.trustUntil
    };
  };

  const session = getCurrentSession();
  const isOwnerSession = session.email === OWNER_EMAIL;

  const TABS = useMemo(() => userRegistry.getTabs(), [tabsVersion]);
  const currentUserTab = TABS.find((tab) => tab.email === session.email);

  const visibleTabs = isOwnerSession
    ? TABS
    : currentUserTab
      ? [currentUserTab]
      : [];

  const nonOwnerTabs = TABS.filter(t => !t.isOwner);

  const viewedUserProjects = useMemo(() => {
    if (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID) return [];
    return userProjectsMap[activeTab] || [{ id: `${activeTab}_P1`, name: 'HOME', index: 1, createdAt: 0 }];
  }, [activeTab, userProjectsMap]);

  const myProjects = useMemo(() => {
    if (!currentUserTab || isOwnerSession) return [];
    return userProjectsMap[currentUserTab.id] || [{ id: `${currentUserTab.id}_P1`, name: 'HOME', index: 1, createdAt: 0 }];
  }, [currentUserTab, isOwnerSession, userProjectsMap]);

  useEffect(() => {
    const localItems = db.getItems();
    setItems(localItems);
    setDefaultNote(localStorage.getItem(DEFAULT_NOTE_KEY) || '');

    // Hydrate default note from Supabase (survives localStorage purge on mobile)
    loadDefaultNote().then((cloudNote) => {
      if (cloudNote !== null) {
        setDefaultNote(cloudNote);
        localStorage.setItem(DEFAULT_NOTE_KEY, cloudNote);
      }
    }).catch(() => undefined);

    // Hydrate registry from Supabase first, then items
    hydrateRegistryFromCloud()
      .then(() => setTabsVersion(v => v + 1))
      .catch(() => undefined);

    db.hydrateFromCloud()
      .then((cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          setItems(cloudItems);
        }
      })
      .catch(() => undefined);
  }, []);

  // ─── Load workspaces and boards ───
  useEffect(() => {
    const loadBoardContext = async () => {
      if (isOwnerSession) {
        const ws = await loadWorkspacesForOwner(session.email);
        setWorkspaces(ws);
        if (ws.length > 0) {
          setActiveWorkspaceId(ws[0].id);
          const bds = await loadBoardsForWorkspace(ws[0].id);
          setBoards(bds);
        }
      } else {
        const userBoards = await loadBoardsForUser(session.email);
        setBoards(userBoards);
        if (userBoards.length > 0) {
          // Derive workspace from the first board
          setActiveWorkspaceId(userBoards[0].workspaceId);
        }
      }
    };
    loadBoardContext().catch(() => undefined);
  }, []);

  // ─── Load user projects for all non-owner tabs ───
  useEffect(() => {
    const loadAllProjects = async () => {
      const map: Record<string, UserProject[]> = {};
      for (const tab of TABS.filter(t => !t.isOwner)) {
        let projects = await loadUserProjects(tab.id);
        // Bootstrap: persist a default Tab 1 when user has no projects yet
        if (projects.length === 0) {
          const defaultProject: UserProject = { id: `${tab.id}_P1`, name: 'Project 1', index: 1, createdAt: Date.now() };
          await saveUserProjects(tab.id, [defaultProject]);
          projects = [defaultProject];
        }
        map[tab.id] = projects;
      }
      setUserProjectsMap(map);
    };
    if (TABS.length > 0) loadAllProjects();
  }, [tabsVersion]);

  useEffect(() => {
    if (isOwnerSession) {
      const activeExists = TABS.some((tab) => tab.id === activeTab) || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID;
      if (!activeExists) {
        setActiveTab('JONO');
      }
      return;
    }

    if (!currentUserTab) {
      return;
    }

    if (activeTab !== currentUserTab.id && activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID) {
      setActiveTab(currentUserTab.id);
    }
  }, [isOwnerSession, currentUserTab?.id, activeTab]);

  // ─── Auto-select first project when switching user tabs ───
  useEffect(() => {
    if (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID) {
      setActiveProjectId(null);
      return;
    }
    const projects = userProjectsMap[activeTab] || [{ id: `${activeTab}_P1`, name: 'Project 1', index: 1, createdAt: 0 }];
    setActiveProjectId(projects[0].id);
  }, [activeTab, userProjectsMap]);

  // ─── TAB 1 "Memory" bridge: hydrate legacy items from Supabase when P1 is active ───
  useEffect(() => {
    if (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID) return;
    const projects = isOwnerSession
      ? (userProjectsMap[activeTab] || [])
      : myProjects;
    const match = projects.find(p => p.id === activeProjectId);
    const isTab1 = match ? match.index === 1 : !activeProjectId;
    if (!isTab1) return;

    getTab1Data(activeTab).then((legacyItems) => {
      if (legacyItems.length === 0) return;
      // Merge legacy cloud items into local state (deduplicate by id)
      setItems(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const newOnes = legacyItems.filter(i => !existingIds.has(i.id));
        return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
      });
    }).catch(() => undefined);
  }, [activeTab, activeProjectId]);

  useEffect(() => {
    if (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID) return;

    // Determine if active project is the TAB 1 "Memory" slot (index 1)
    const activeIsTab1 = (() => {
      const projects = userProjectsMap[activeTab];
      if (!projects) return true; // default single-project state = TAB 1
      const match = projects.find(p => p.id === activeProjectId);
      return match ? match.index === 1 : false;
    })();

    const unreadFromOtherSide = items.filter((item) => {
      const inThisSyncTab = item.syncTabId === activeTab;
      const inThisView = isChatAnchor(activeProjectId)
        ? item.type === ItemType.CHAT
        : item.type !== ItemType.CHAT && (
            (item.projectId || 'default') === (activeProjectId || 'default')
            || (activeIsTab1 && isLegacyProjectId(item.projectId))
          );
      const fromOtherUser = item.userId !== session.email;
      const notReadYet = !(item.readBy || []).includes(session.email);
      return inThisSyncTab && inThisView && fromOtherUser && notReadYet;
    });

    if (unreadFromOtherSide.length === 0) return;

    unreadFromOtherSide.forEach((item) => db.markAsRead(item.id, session.email));
    setItems(db.getItems());
  }, [activeTab, activeProjectId, items.length, session.email]);

  // ─── Chat polling: refresh items every 5s when chat is active ───
  useEffect(() => {
    if (!isChatAnchor(activeProjectId)) return;
    const poll = async () => {
      const cloudItems = await db.hydrateFromCloud();
      if (cloudItems && cloudItems.length > 0) {
        // Merge: keep local-only items (not yet synced) alongside cloud data
        setItems(prev => {
          const cloudIds = new Set(cloudItems.map(i => i.id));
          const localOnly = prev.filter(i => !cloudIds.has(i.id));
          return [...localOnly, ...cloudItems];
        });
      }
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [activeProjectId]);

  // ─── Presence heartbeat: ping every 30s so owner can see who's active ───
  useEffect(() => {
    sendPresenceHeartbeat(session.email);
    const interval = setInterval(() => sendPresenceHeartbeat(session.email), 30_000);
    return () => clearInterval(interval);
  }, [session.email]);

  // ─── Owner: live status polling for the currently-viewed user tab ───
  const [viewedUserStatus, setViewedUserStatus] = useState<'ACTIVE NOW' | 'IDLE' | 'OFFLINE'>('OFFLINE');
  const [viewedUserLastSeen, setViewedUserLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwnerSession) return;
    if (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID) return;

    const targetTab = TABS.find(t => t.id === activeTab);
    if (!targetTab) return;

    const poll = async () => {
      const data = await getUserPresence(targetTab.email);
      if (!data) { setViewedUserStatus('OFFLINE'); setViewedUserLastSeen(null); return; }
      const age = Date.now() - data.timestamp;
      setViewedUserStatus(age < 60_000 ? 'ACTIVE NOW' : age < 300_000 ? 'IDLE' : 'OFFLINE');
      setViewedUserLastSeen(new Date(data.timestamp).toLocaleTimeString());
    };

    poll();
    const interval = setInterval(poll, 15_000);
    return () => clearInterval(interval);
  }, [isOwnerSession, activeTab, TABS]);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('jb3_session');
    window.location.reload();
  };

  const handleResetPin = async () => {
    if (supabase) await supabase.auth.signOut();
    await supabaseAuth.resetPin(session.email);
    localStorage.removeItem('jb3_session');
    window.location.reload();
  };

  const saveDefaultNote = () => {
    localStorage.setItem(DEFAULT_NOTE_KEY, defaultNote);
    saveDefaultNoteToCloud(defaultNote);
    showToast('Announcement saved', 'success');
  };

  const refreshTabs = useCallback(() => setTabsVersion((v) => v + 1), []);

  const handleInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    const name = inviteName.trim();
    if (!email || !name) {
      showToast('Email and display name required', 'error');
      return;
    }
    try {
      userRegistry.addUser(email, name);
      refreshTabs();
      showToast(`Invite dispatched to ${email}`, 'success');
      setInviteEmail('');
      setInviteName('');
    } catch (err: any) {
      showToast(err.message || 'Failed to add user', 'error');
    }
  };

  const handleRemoveUser = (email: string) => {
    const user = userRegistry.getUserByEmail(email);
    try {
      userRegistry.removeUser(email);
      refreshTabs();
      showToast('User removed from registry', 'success');
      if (user && activeTab === user.id) {
        setActiveTab('JONO');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove user', 'error');
    }
  };

  const handleResetUserVisibility = (targetUserId: string) => {
    if (!isOwnerSession) return;
    if (!targetUserId || targetUserId === 'JONO' || targetUserId === DEMO_TAB_ID || targetUserId === SETTINGS_TAB_ID) return;

    const channelItems = items.filter((item) => item.syncTabId === targetUserId && (item.readBy || []).length > 0);
    if (channelItems.length === 0) {
      showToast('No visibility markers to reset in this channel', 'info');
      return;
    }

    channelItems.forEach((item) => {
      // Reset visibility/read receipt state only. Keep content intact.
      db.updateItem(item.id, session.email, { readBy: [] });
    });

    setItems(db.getItems());
    showToast(`Visibility reset on ${channelItems.length} record${channelItems.length > 1 ? 's' : ''}`, 'success');
  };



  const getActiveSyncTabId = () => (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID ? undefined : activeTab);

  const getActiveProjectId = (): string | undefined => {
    if (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID) return undefined;
    if (isChatAnchor(activeProjectId)) return undefined;
    return activeProjectId || 'default';
  };

  /** Returns the project id chosen in the form's Target Tab picker, falling back to current active project */
  const getFormTargetProjectId = (): string | undefined => {
    if (newItemTargetProjectId) return newItemTargetProjectId;
    return getActiveProjectId();
  };

  /** Active board for new items. null = no board context (legacy). */
  const getActiveBoardId = (): string | undefined => activeBoardId || undefined;

  const MAX_PROJECT_TABS = 7; // 8th slot reserved for Chat
  const MAX_TAB_NAME_LENGTH = 20;

  /** Display label: HOME for slot 1, custom label or fallback TAB{n} for slot 2+ */
  const getTabLabel = (project: UserProject): string => {
    if (project.index === 1) return 'HOME';
    const custom = project.name;
    if (!custom || custom.startsWith('Project ')) return `TAB${project.index}`;
    return custom;
  };

  const openNewTabModal = (userId: string) => {
    const projects = userProjectsMap[userId] || [{ id: `${userId}_P1`, name: 'Project 1', index: 1, createdAt: 0 }];
    if (projects.length >= MAX_PROJECT_TABS) {
      showToast('Maximum tabs reached (HOME + 7 project tabs)', 'error');
      return;
    }
    setNewTabTargetUserId(userId);
    setNewTabName('');
    setShowNewTabModal(true);
  };

  const openRenameModal = (userId: string, projectId: string, currentName: string) => {
    // Block rename on HOME tab (index 1)
    const projects = userProjectsMap[userId] || [];
    const target = projects.find(p => p.id === projectId);
    if (target && target.index === 1) {
      showToast('HOME tab cannot be renamed', 'info');
      return;
    }
    setRenameProjectUserId(userId);
    setRenameProjectId(projectId);
    setRenameLabel(currentName.startsWith('Project ') ? '' : currentName);
    setShowRenameModal(true);
  };

  const handleRenameProject = async () => {
    const userId = renameProjectUserId;
    const projects = userProjectsMap[userId] || [];
    const updated = projects.map(p =>
      p.id === renameProjectId ? { ...p, name: renameLabel.trim() || `Project ${p.index}` } : p
    );
    setUserProjectsMap(prev => ({ ...prev, [userId]: updated }));
    await saveUserProjects(userId, updated);
    setShowRenameModal(false);
    showToast('Tab label updated', 'success');
  };

  const handleCreateNewProject = async (userId: string, tabName?: string) => {
    const projects = userProjectsMap[userId] || [{ id: `${userId}_P1`, name: 'HOME', index: 1, createdAt: 0 }];
    if (projects.length >= MAX_PROJECT_TABS) {
      showToast('Maximum tabs reached (HOME + 7 project tabs)', 'error');
      return;
    }
    // Append new project after the last slot — HOME stays at index 1
    const maxIndex = Math.max(...projects.map(p => p.index), 0);
    const newProject: UserProject = {
      id: `${userId}_P${Date.now()}`,
      name: tabName?.trim() || `Project ${maxIndex + 1}`,
      index: maxIndex + 1,
      createdAt: Date.now(),
    };
    const updated = [...projects, newProject].sort((a, b) => a.index - b.index);
    setUserProjectsMap(prev => ({ ...prev, [userId]: updated }));
    await saveUserProjects(userId, updated);
    setActiveProjectId(newProject.id);
    showToast(`Project tab created: ${newProject.name}`, 'success');
  };

  /** Ensure every target user has at least one project tab (HOME) before distributing items */
  const ensureUserProjectsExist = async (userIds: string[]) => {
    for (const userId of userIds) {
      const existing = userProjectsMap[userId];
      if (!existing || existing.length === 0) {
        const defaultProject: UserProject = { id: `${userId}_P1`, name: 'HOME', index: 1, createdAt: Date.now() };
        await saveUserProjects(userId, [defaultProject]);
        setUserProjectsMap(prev => ({ ...prev, [userId]: [defaultProject] }));
      }
    }
  };

  const handleSendChat = (content: string) => {
    const syncTabId = getActiveSyncTabId();
    if (!syncTabId) return;
    const chatItem = db.addItem({
      userId: session.email,
      syncTabId,
      boardId: getActiveBoardId(),
      type: ItemType.CHAT,
      title: 'Chat',
      content,
    });
    logBoardActivity(getActiveBoardId(), session.email, 'item_created', chatItem.id);
    setItems(db.getItems());
  };

  /** Owner Comms Hub: send a chat message to a specific user channel */
  const handleCommsSend = (targetUserId: string, content: string) => {
    const chatItem = db.addItem({
      userId: session.email,
      syncTabId: targetUserId,
      boardId: getActiveBoardId(),
      type: ItemType.CHAT,
      title: 'Chat',
      content,
    });
    logBoardActivity(getActiveBoardId(), session.email, 'item_created', chatItem.id);
    setItems(db.getItems());
  };

  const canPost = activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && !isChatAnchor(activeProjectId) && (isOwnerSession || activeTab === currentUserTab?.id);
  const isOwnerMainTab = isOwnerSession && activeTab === 'JONO';
  const showOwnerAdminPanels = isOwnerMainTab;

  if (!isOwnerSession && !currentUserTab) {
    return (
      <SessionGuard>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8">
          <p className="text-[11px] tracking-[0.2em] uppercase text-muted/60 font-bold">No user tab assigned to this login</p>
          <button onClick={handleLogout} className="px-6 py-3 rounded-xl border border-edge text-[10px] tracking-[0.2em] uppercase text-primary/70 hover:text-primary">
            Sign Out
          </button>
        </div>
      </SessionGuard>
    );
  }

  const handleEdit = (item: ClipboardItem) => {
    setEditingItem(item);
    setNewItemType(item.type);
    setNewItemFile(null);

    if (item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) {
      setNewItemTitle(item.content);
      setNewItemContent(item.metadata?.description || '');
    } else if (item.type === ItemType.DOCUMENT) {
      setNewItemTitle(item.title);
      setNewItemContent(item.content); // notes
    } else if (item.type === ItemType.IMAGE || item.type === ItemType.VIDEO) {
      setNewItemTitle(item.title);
      setNewItemContent(item.content); // caption/notes
    } else {
      setNewItemTitle(item.title);
      setNewItemContent(item.content);
    }

    setNewItemDueDate(item.dueDate || '');
    setNewItemLocation(item.eventLocation || '');
    setNewItemIsDemo(item.isDemo || false);
    setIsAdding(true);
  };

  const handleAddLink = async (url: string, explicitType?: ItemType, manualNote?: string, overrideProjectId?: string) => {
    let hostname = 'LINK';
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url.split('/')[2] || 'LINK';
    }

    const finalType = explicitType || (url.includes('youtube.com') || url.includes('youtu.be') ? ItemType.YOUTUBE : ItemType.WEBPAGE);
    const syncTabId = getActiveSyncTabId();
    const projectId = overrideProjectId || getActiveProjectId();

    const item = db.addItem({
      userId: session.email,
      syncTabId,
      projectId,
      boardId: getActiveBoardId(),
      type: finalType,
      title: hostname,
      content: url,
      enrichmentStatus: EnrichmentStatus.PENDING,
      metadata: manualNote ? { description: manualNote } : {}
    });

    logBoardActivity(getActiveBoardId(), session.email, 'item_created', item.id);

    // Owner always gets a copy on their own board when posting to a user tab
    const ownerCopy = (isOwnerSession && syncTabId) ? db.addItem({
      userId: session.email,
      syncTabId: undefined,
      projectId: undefined,
      boardId: getActiveBoardId(),
      type: finalType,
      title: hostname,
      content: url,
      enrichmentStatus: EnrichmentStatus.PENDING,
      metadata: manualNote ? { description: manualNote } : {}
    }) : null;

    setItems(db.getItems());

    try {
      const metadata = await resolveMetadata(url);
      const valid = !!(metadata.title || metadata.siteName || metadata.og_image_url);

      const finalMetadata = valid
        ? { ...metadata, description: manualNote || metadata.description }
        : manualNote ? { ...metadata, description: manualNote } : metadata;
      const enrichStatus = valid ? EnrichmentStatus.SUCCESS : EnrichmentStatus.FAILED;

      db.updateItem(item.id, session.email, { metadata: finalMetadata, enrichmentStatus: enrichStatus });
      if (ownerCopy) db.updateItem(ownerCopy.id, session.email, { metadata: finalMetadata, enrichmentStatus: enrichStatus });
    } catch {
      db.updateItem(item.id, session.email, { enrichmentStatus: EnrichmentStatus.FAILED });
      if (ownerCopy) db.updateItem(ownerCopy.id, session.email, { enrichmentStatus: EnrichmentStatus.FAILED });
    } finally {
      setItems(db.getItems());
    }
  };

  const filteredItems = useMemo(() => {
    let baseItems: ClipboardItem[] = [];

    if (activeTab === 'JONO') {
      baseItems = items.filter((item) => item.userId === OWNER_EMAIL && !item.syncTabId);
    } else if (isChatAnchor(activeProjectId)) {
      baseItems = items.filter((item) => item.syncTabId === activeTab && item.type === ItemType.CHAT);
    } else {
      const pid = activeProjectId || 'default';
      // Determine if we're viewing the TAB 1 "Memory" slot (index 1)
      const viewingTab1 = (() => {
        const projects = isOwnerSession
          ? (userProjectsMap[activeTab] || [])
          : myProjects;
        const match = projects.find(p => p.id === activeProjectId);
        return match ? match.index === 1 : !activeProjectId;
      })();

      baseItems = items.filter((item) => {
        if (item.syncTabId !== activeTab) return false;
        if (item.type === ItemType.CHAT) return false;
        // TAB 1 captures legacy items (null / 'default' projectId) + exact match
        if (viewingTab1 && isLegacyProjectId(item.projectId)) return true;
        return (item.projectId || 'default') === pid;
      });
    }

    // Board filter — when a board is selected, show only items on that board (plus legacy unassigned items)
    if (activeBoardId) {
      baseItems = baseItems.filter((item) => item.boardId === activeBoardId || !item.boardId);
    }

    return baseItems.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        item.title?.toLowerCase().includes(term) ||
        item.content?.toLowerCase().includes(term) ||
        (item.metadata?.title || '').toLowerCase().includes(term) ||
        (item.metadata?.description || '').toLowerCase().includes(term);

      return !item.isArchived && matchesSearch;
    }).sort((a, b) => {
      // Sort by board_position (NULLS LAST), then by created_at DESC
      if (a.boardPosition != null && b.boardPosition != null) return a.boardPosition - b.boardPosition;
      if (a.boardPosition != null) return -1;
      if (b.boardPosition != null) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [items, activeTab, activeProjectId, searchTerm, activeBoardId]);

  const getIconForType = (type: ItemType) => {
    switch (type) {
      case ItemType.NOTE: return <FileText size={14} />;
      case ItemType.TASK: return <CheckSquare size={14} />;
      case ItemType.EVENT: return <Calendar size={14} />;
      case ItemType.WEBPAGE: return <Globe size={14} />;
      case ItemType.YOUTUBE: return <Youtube size={14} />;
      case ItemType.DOCUMENT: return <FileArchive size={14} />;
      case ItemType.IMAGE: return <ImageIcon size={14} />;
      case ItemType.VIDEO: return <VideoIcon size={14} />;
      default: return <Plus size={14} />;
    }
  };

  const handleRefresh = async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    db.updateItem(id, session.email, {
      enrichmentStatus: EnrichmentStatus.PENDING,
    });

    setItems(db.getItems());

    try {
      const metadata = await resolveMetadata(item.content);
      const valid = !!(metadata.title || metadata.siteName || metadata.og_image_url);
      const failCount = (item.preview_fail_count || 0) + 1;
      const isDelayed = !valid && failCount >= 3;
      const cooldown = isDelayed ? 300000 : 60000; // 5 min if delayed, 1 min otherwise

      db.updateItem(id, session.email, {
        metadata: { ...item.metadata, ...metadata },
        enrichmentStatus: valid ? EnrichmentStatus.SUCCESS : (isDelayed ? EnrichmentStatus.DELAYED : EnrichmentStatus.FAILED),
        preview_fail_count: valid ? 0 : failCount,
        preview_last_fetched_at: Date.now(),
        preview_next_allowed_at: Date.now() + cooldown
      });
    } catch {
      const failCount = (item.preview_fail_count || 0) + 1;
      const isDelayed = failCount >= 3;
      db.updateItem(id, session.email, {
        enrichmentStatus: isDelayed ? EnrichmentStatus.DELAYED : EnrichmentStatus.FAILED,
        preview_fail_count: failCount,
        preview_last_fetched_at: Date.now(),
        preview_next_allowed_at: Date.now() + (isDelayed ? 300000 : 60000)
      });
    } finally {
      setItems(db.getItems());
    }
  };

  const handleCommit = async () => {
    if (editingItem) {
      const updates: Partial<ClipboardItem> = {
        type: newItemType,
        taskStatus: newItemType === ItemType.TASK ? (editingItem.taskStatus || TaskStatus.OPEN) : undefined,
        dueDate: newItemType === ItemType.TASK || newItemType === ItemType.EVENT ? newItemDueDate : undefined,
        eventLocation: newItemType === ItemType.EVENT ? newItemLocation : undefined,
        isDemo: newItemIsDemo
      };

      if (newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE) {
        updates.content = newItemTitle;
        updates.metadata = { ...editingItem.metadata, description: newItemContent };
      } else if (newItemType === ItemType.DOCUMENT) {
        updates.title = newItemTitle || editingItem.fileName || 'Document';
        updates.content = newItemContent; // notes
        // If user picked a new replacement file, upload it
        if (newItemFile) {
          setIsUploading(true);
          try {
            const result = await uploadDocument(newItemFile, session.email);
            if (result) {
              updates.fileUrl = result.url;
              updates.fileName = newItemFile.name;
              updates.fileSize = newItemFile.size;
            }
          } catch (err: any) {
            showToast(err.message || 'Upload failed', 'error');
            setIsUploading(false);
            return;
          }
          setIsUploading(false);
        }
      } else if (newItemType === ItemType.IMAGE || newItemType === ItemType.VIDEO) {
        updates.title = newItemTitle || editingItem.fileName || (newItemType === ItemType.IMAGE ? 'Image' : 'Video');
        updates.content = newItemContent;
        if (newItemFile) {
          setIsUploading(true);
          try {
            const result = await uploadMedia(newItemFile, session.email);
            if (result) {
              updates.fileUrl = result.url;
              updates.fileName = newItemFile.name;
              updates.fileSize = newItemFile.size;
            }
          } catch (err: any) {
            showToast(err.message || 'Upload failed', 'error');
            setIsUploading(false);
            return;
          }
          setIsUploading(false);
        }
      } else {
        updates.title = newItemTitle || 'Untitled Log';
        updates.content = newItemContent;
      }

      db.updateItem(editingItem.id, session.email, updates);

      // Copy card to selected users (owner only, edit mode)
      if (isOwnerSession && editCopyToUsers.length > 0) {
        await ensureUserProjectsExist(editCopyToUsers);
        const copyBase: any = {
          userId: session.email,
          type: updates.type || editingItem.type,
          title: updates.title || editingItem.title,
          content: updates.content || editingItem.content,
          taskStatus: updates.taskStatus,
          dueDate: updates.dueDate,
          eventLocation: updates.eventLocation,
          isDemo: updates.isDemo,
          fileUrl: updates.fileUrl || editingItem.fileUrl,
          fileName: updates.fileName || editingItem.fileName,
          fileSize: updates.fileSize || editingItem.fileSize,
          metadata: updates.metadata || editingItem.metadata,
          enrichmentStatus: editingItem.enrichmentStatus,
          projectId: getFormTargetProjectId() || 'default',
          boardId: editingItem.boardId || getActiveBoardId(),
        };
        db.addItemBatch(copyBase, editCopyToUsers);
        setItems(db.getItems());
        showToast(`Card copied to ${editCopyToUsers.length} user${editCopyToUsers.length > 1 ? 's' : ''}`, 'success');
      }

      setEditingItem(null);
    } else if (isOwnerSession && selectedTargetUsers.length > 0) {
      // ─── Multi-user batch path ───
      await ensureUserProjectsExist(selectedTargetUsers);
      if (newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE) {
        const url = newItemTitle;
        let hostname = 'LINK';
        try { hostname = new URL(url).hostname; } catch { hostname = url.split('/')[2] || 'LINK'; }
        const finalType = newItemType === ItemType.YOUTUBE || url.includes('youtube.com') || url.includes('youtu.be')
          ? ItemType.YOUTUBE : ItemType.WEBPAGE;

        const batchItems = db.addItemBatch({
          userId: session.email,
          type: finalType,
          title: hostname,
          content: url,
          enrichmentStatus: EnrichmentStatus.PENDING,
          metadata: newItemContent ? { description: newItemContent } : {},
          isDemo: newItemIsDemo,
          projectId: getFormTargetProjectId() || 'default',
          boardId: getActiveBoardId(),
        }, selectedTargetUsers);

        setItems(db.getItems());

        try {
          const metadata = await resolveMetadata(url);
          const valid = !!(metadata.title || metadata.siteName || metadata.og_image_url);
          const finalMetadata = valid
            ? { ...metadata, description: newItemContent || metadata.description }
            : newItemContent ? { ...metadata, description: newItemContent } : metadata;
          const status = valid ? EnrichmentStatus.SUCCESS : EnrichmentStatus.FAILED;
          for (const bi of batchItems) {
            db.updateItem(bi.id, session.email, { metadata: finalMetadata, enrichmentStatus: status });
          }
        } catch {
          for (const bi of batchItems) {
            db.updateItem(bi.id, session.email, { enrichmentStatus: EnrichmentStatus.FAILED });
          }
        }
        setItems(db.getItems());

      } else if (newItemType === ItemType.DOCUMENT) {
        if (!newItemFile) { showToast('Please select a file to upload', 'error'); return; }
        setIsUploading(true);
        try {
          const result = await uploadDocument(newItemFile, session.email);
          if (!result) { showToast('Storage not configured — cannot upload documents', 'error'); setIsUploading(false); return; }
          db.addItemBatch({
            userId: session.email,
            type: ItemType.DOCUMENT,
            title: newItemTitle || newItemFile.name,
            content: newItemContent,
            fileUrl: result.url,
            fileName: newItemFile.name,
            fileSize: newItemFile.size,
            isDemo: newItemIsDemo,
            projectId: getFormTargetProjectId() || 'default',
            boardId: getActiveBoardId(),
          }, selectedTargetUsers);
          setItems(db.getItems());
        } catch (err: any) {
          showToast(err.message || 'Upload failed', 'error');
          setIsUploading(false);
          return;
        }
        setIsUploading(false);

      } else if (newItemType === ItemType.IMAGE || newItemType === ItemType.VIDEO) {
        if (!newItemFile) { showToast('Please select a file to upload', 'error'); return; }
        setIsUploading(true);
        try {
          const result = await uploadMedia(newItemFile, session.email);
          if (!result) { showToast('Storage not configured — cannot upload media', 'error'); setIsUploading(false); return; }
          db.addItemBatch({
            userId: session.email,
            type: newItemType,
            title: newItemTitle || newItemFile.name,
            content: newItemContent,
            fileUrl: result.url,
            fileName: newItemFile.name,
            fileSize: newItemFile.size,
            isDemo: newItemIsDemo,
            projectId: getFormTargetProjectId() || 'default',
            boardId: getActiveBoardId(),
          }, selectedTargetUsers);
          setItems(db.getItems());
        } catch (err: any) {
          showToast(err.message || 'Upload failed', 'error');
          setIsUploading(false);
          return;
        }
        setIsUploading(false);

      } else {
        db.addItemBatch({
          userId: session.email,
          type: newItemType,
          title: newItemTitle || 'Untitled Log',
          content: newItemContent,
          taskStatus: newItemType === ItemType.TASK ? TaskStatus.OPEN : undefined,
          dueDate: newItemType === ItemType.TASK || newItemType === ItemType.EVENT ? newItemDueDate : undefined,
          eventLocation: newItemType === ItemType.EVENT ? newItemLocation : undefined,
          isDemo: newItemIsDemo,
          projectId: getFormTargetProjectId() || 'default',
          boardId: getActiveBoardId(),
        }, selectedTargetUsers);
      }

      setItems(db.getItems());
      showToast(`Entry shared to ${selectedTargetUsers.length} user${selectedTargetUsers.length > 1 ? 's' : ''}`, 'success');
    } else {
      if (newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE) {
        await handleAddLink(newItemTitle, newItemType, newItemContent, getFormTargetProjectId());
      } else if (newItemType === ItemType.DOCUMENT) {
        if (!newItemFile) {
          showToast('Please select a file to upload', 'error');
          return;
        }
        setIsUploading(true);
        try {
          const result = await uploadDocument(newItemFile, session.email);
          if (!result) {
            showToast('Storage not configured — cannot upload documents', 'error');
            setIsUploading(false);
            return;
          }
          const activeSyncTabDoc = getActiveSyncTabId();
          const activeProjectDoc = getFormTargetProjectId();
          db.addItem({
            userId: session.email,
            syncTabId: activeSyncTabDoc,
            projectId: activeProjectDoc,
            boardId: getActiveBoardId(),
            type: ItemType.DOCUMENT,
            title: newItemTitle || newItemFile.name,
            content: newItemContent,
            fileUrl: result.url,
            fileName: newItemFile.name,
            fileSize: newItemFile.size,
            isDemo: newItemIsDemo,
          });
          if (isOwnerSession && activeSyncTabDoc) db.addItem({
            userId: session.email,
            syncTabId: undefined,
            projectId: undefined,
            boardId: getActiveBoardId(),
            type: ItemType.DOCUMENT,
            title: newItemTitle || newItemFile.name,
            content: newItemContent,
            fileUrl: result.url,
            fileName: newItemFile.name,
            fileSize: newItemFile.size,
            isDemo: newItemIsDemo,
          });
        } catch (err: any) {
          showToast(err.message || 'Upload failed', 'error');
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      } else if (newItemType === ItemType.IMAGE || newItemType === ItemType.VIDEO) {
        if (!newItemFile) {
          showToast('Please select a file to upload', 'error');
          return;
        }
        setIsUploading(true);
        try {
          const result = await uploadMedia(newItemFile, session.email);
          if (!result) {
            showToast('Storage not configured — cannot upload media', 'error');
            setIsUploading(false);
            return;
          }
          const activeSyncTabMedia = getActiveSyncTabId();
          const activeProjectMedia = getFormTargetProjectId();
          db.addItem({
            userId: session.email,
            syncTabId: activeSyncTabMedia,
            projectId: activeProjectMedia,
            boardId: getActiveBoardId(),
            type: newItemType,
            title: newItemTitle || newItemFile.name,
            content: newItemContent,
            fileUrl: result.url,
            fileName: newItemFile.name,
            fileSize: newItemFile.size,
            isDemo: newItemIsDemo,
          });
          if (isOwnerSession && activeSyncTabMedia) db.addItem({
            userId: session.email,
            syncTabId: undefined,
            projectId: undefined,
            boardId: getActiveBoardId(),
            type: newItemType,
            title: newItemTitle || newItemFile.name,
            content: newItemContent,
            fileUrl: result.url,
            fileName: newItemFile.name,
            fileSize: newItemFile.size,
            isDemo: newItemIsDemo,
          });
        } catch (err: any) {
          showToast(err.message || 'Upload failed', 'error');
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      } else {
        const activeSyncTabPlain = getActiveSyncTabId();
        const activeProjectPlain = getFormTargetProjectId();
        db.addItem({
          userId: session.email,
          syncTabId: activeSyncTabPlain,
          projectId: activeProjectPlain,
          boardId: getActiveBoardId(),
          type: newItemType,
          title: newItemTitle || 'Untitled Log',
          content: newItemContent,
          taskStatus: newItemType === ItemType.TASK ? TaskStatus.OPEN : undefined,
          dueDate: newItemType === ItemType.TASK || newItemType === ItemType.EVENT ? newItemDueDate : undefined,
          eventLocation: newItemType === ItemType.EVENT ? newItemLocation : undefined,
          isDemo: newItemIsDemo
        });
        if (isOwnerSession && activeSyncTabPlain) db.addItem({
          userId: session.email,
          syncTabId: undefined,
          projectId: undefined,
          boardId: getActiveBoardId(),
          type: newItemType,
          title: newItemTitle || 'Untitled Log',
          content: newItemContent,
          taskStatus: newItemType === ItemType.TASK ? TaskStatus.OPEN : undefined,
          dueDate: newItemType === ItemType.TASK || newItemType === ItemType.EVENT ? newItemDueDate : undefined,
          eventLocation: newItemType === ItemType.EVENT ? newItemLocation : undefined,
          isDemo: newItemIsDemo
        });
      }
    }

    // Fire-and-forget activity log for item creation (not edits — edits are handled by onUpdate)
    if (!editingItem) {
      logBoardActivity(getActiveBoardId(), session.email, 'item_created');
    }

    setItems(db.getItems());
    setIsAdding(false);
    setNewItemTitle('');
    setNewItemContent('');
    setNewItemDueDate('');
    setNewItemLocation('');
    setNewItemFile(null);
    setSelectedTargetUsers([]);
    setNewItemTargetProjectId(null);
    setEditCopyToUsers([]);
  };

  const handleOpenShare = (item: ClipboardItem) => {
    setShareItem(item);
    setShareTargetUsers([]);
  };

  const handleShareConfirm = () => {
    if (!shareItem || shareTargetUsers.length === 0) return;
    db.addItemBatch({
      userId: shareItem.userId,
      type: shareItem.type,
      title: shareItem.title,
      content: shareItem.content,
      taskStatus: shareItem.taskStatus,
      dueDate: shareItem.dueDate,
      eventLocation: shareItem.eventLocation,
      metadata: shareItem.metadata,
      enrichmentStatus: shareItem.enrichmentStatus,
      isDemo: shareItem.isDemo,
      fileUrl: shareItem.fileUrl,
      fileName: shareItem.fileName,
      fileSize: shareItem.fileSize,
      projectId: 'default',
      boardId: shareItem.boardId || getActiveBoardId(),
    }, shareTargetUsers);
    setItems(db.getItems());
    showToast(`Shared to ${shareTargetUsers.length} user${shareTargetUsers.length > 1 ? 's' : ''}`, 'success');
    setShareItem(null);
    setShareTargetUsers([]);
  };

  const sectionTitle = activeTab === 'JONO'
    ? 'OWNER MAIN CLIPBOARD: JONO'
    : activeTab === DEMO_TAB_ID
      ? 'DEMO PROJECT SHOWCASE'
      : activeTab === SETTINGS_TAB_ID
        ? 'INTERFACE SETTINGS'
      : isChatAnchor(activeProjectId)
        ? `1:1 SECURE CHAT: JONO ↔ ${activeTab}`
        : `SYNC CHANNEL: JONO ↔ ${activeTab}`;

  const signedInName = (currentUserTab?.label || session.email.split('@')[0] || 'USER').toUpperCase();
  const signedInRole = isOwnerSession ? 'OWNER ACCESS' : 'USER ACCESS';

  return (
    <SessionGuard>
        <div className="relative min-h-screen">
          {/* Fixed background — theme-reactive (z-0) */}
          <div
            key={bgImage}
            className="fixed inset-0 z-0 bg-center bg-cover bg-no-repeat transition-all duration-1000"
            style={{ backgroundImage: `url('${bgImage}')` }}
          />
          {/* Atmospheric depth — Environment_Blur.jpg (z-10) */}
          <div
            className="fixed inset-0 z-10 bg-center bg-cover bg-no-repeat opacity-15 blur-2xl"
            style={{ backgroundImage: `url('${import.meta.env.BASE_URL}Media/Environment_Blur.jpg')` }}
          />
          {/* Dark readability overlays (z-20) */}
          <div className="fixed inset-0 z-20" style={{ backgroundColor: 'var(--bg-dark)', opacity: 0.75 }} />
          <div className="fixed inset-0 z-20 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

          {/* AES-256 Modal (z-[150] — above header, below Transition Hub) */}
          {showAES && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setShowAES(false)}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="relative bg-card border border-edge rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-8 space-y-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] tracking-[0.3em] uppercase text-accent font-bold flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}Media/landscape_header_icon.jpg`} alt="AES-256" className="h-6 rounded-md object-contain" /> AES-256 Encryption</h2>
                  <button onClick={() => setShowAES(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={18} /></button>
                </div>
                <div className="h-[1px] bg-card/20" />
                <p className="text-[13px] text-primary/40 leading-relaxed font-light">
                  AES-256 (Advanced Encryption Standard with a 256-bit key) is the ultimate digital fortress for the modern age. As a symmetric-key algorithm, it uses a single, top-secret key to both lock and unlock data through a complex series of mathematical &ldquo;rounds.&rdquo; It is so secure that it is the only publicly accessible cipher approved by the U.S. National Security Agency (NSA) for protecting &ldquo;Top Secret&rdquo; military communications and state secrets.
                </p>
                <p className="text-[13px] text-primary/40 leading-relaxed font-light">
                  Beyond the battlefield, it is the backbone of global finance, used by banks to secure trillions of dollars in daily transactions. The &ldquo;256&rdquo; refers to the key&rsquo;s length, which creates a staggering 2<sup>256</sup> possible combinations. To put that in perspective, even if you harnessed every supercomputer on Earth, it would take billions of years to crack a single file via brute force. In practical terms, it is literally impossible to break with current technology, ensuring your private data remains yours alone.
                </p>
                <div className="h-[1px] bg-card/20" />
                <p className="text-[10px] tracking-[0.2em] text-primary/20 text-center uppercase">AES-256 &middot; Military-Grade Encryption</p>
              </div>
            </div>
          )}

          {/* Info Modal */}
          {/* Info modal (z-[150]) */}
          {showInfo && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setShowInfo(false)}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="relative bg-card border border-edge rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-8 space-y-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] tracking-[0.3em] uppercase text-accent font-bold">OS³ Clipboard — Quick Guide</h2>
                  <button onClick={() => setShowInfo(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={18} /></button>
                </div>
                <div className="h-[1px] bg-card/20" />

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">What is this?</h3>
                  <p className="text-[13px] text-primary/40 leading-relaxed font-light">
                    A shared clipboard for the JB3 team. Save notes, links, tasks, events, documents, images, and videos, all synced in real time.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Workspaces and boards</h3>
                  <ul className="text-[13px] text-primary/40 leading-relaxed font-light space-y-2 list-none">
                    <li className="flex gap-3"><span className="text-primary/60">Workspace</span> — A client or project space that groups your boards</li>
                    <li className="flex gap-3"><span className="text-primary/60">Board</span> — A focused working area inside a workspace</li>
                    <li className="flex gap-3"><span className="text-accent/60">ALL</span> — Shows every item in the workspace, including unassigned items</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Adding items</h3>
                  <ul className="text-[13px] text-primary/40 leading-relaxed font-light space-y-2 list-none">
                    <li className="flex gap-3"><span className="text-accent/60">1.</span> Paste a URL into the link bar to auto-detect YouTube or webpage links</li>
                    <li className="flex gap-3"><span className="text-accent/60">2.</span> Click <span className="text-primary/60">+</span> to create a Note, Task, Event, Document, Image, or Video</li>
                    <li className="flex gap-3"><span className="text-accent/60">3.</span> Documents (PDF, DOC, XLS, etc.) up to 20 MB</li>
                    <li className="flex gap-3"><span className="text-accent/60">4.</span> Images and videos up to 50 MB</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Card actions</h3>
                  <ul className="text-[13px] text-primary/40 leading-relaxed font-light space-y-2 list-none">
                    <li className="flex gap-3"><span className="text-yellow-400/60">Pin</span> — Keep a card at the top of the board</li>
                    <li className="flex gap-3"><span className="text-blue-400/60">Edit</span> — Change the title, notes, or attached files</li>
                    <li className="flex gap-3"><span className="text-red-400/60">Delete</span> — Remove a card permanently</li>
                    <li className="flex gap-3"><span className="text-purple-400/60">Archive</span> — Hide a card without deleting it</li>
                    <li className="flex gap-3"><span className="text-primary/60">Share</span> — Send a card to another team member</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Link previews</h3>
                  <p className="text-[13px] text-primary/40 leading-relaxed font-light">
                    When you paste a link, a preview is fetched automatically. If the preview is delayed, you can retry later using the refresh button on the card.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Tabs</h3>
                  <ul className="text-[13px] text-primary/40 leading-relaxed font-light space-y-2 list-none">
                    <li className="flex gap-3"><span className="text-primary/60">User tabs</span> — Each team member's personal clipboard</li>
                    <li className="flex gap-3"><span className="text-accent/60">DEMO</span> — A shared showcase tab visible to everyone</li>
                    <li className="flex gap-3"><span className="text-primary/60">SETTINGS</span> — Change your PIN, theme, and font size</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Owner features</h3>
                  <p className="text-[13px] text-primary/40 leading-relaxed font-light">
                    The owner can view and post to all tabs, invite or remove team members, and manage every board. Regular users see their own tab, DEMO, and Settings.
                  </p>
                </section>

                <div className="h-[1px] bg-card/20" />
                <p className="text-[10px] tracking-[0.2em] text-primary/20 text-center uppercase">JB3 AI &middot; OS³ Clipboard v2</p>
              </div>
            </div>
          )}

          {/* New Tab Modal (z-[150]) */}
          {showNewTabModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setShowNewTabModal(false)}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="relative bg-card border border-edge rounded-3xl max-w-sm w-full p-8 space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] tracking-[0.3em] uppercase text-accent font-bold flex items-center gap-3">
                    <FolderPlus size={16} />
                    New Tab
                  </h2>
                  <button onClick={() => setShowNewTabModal(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold">Tab Name (max {MAX_TAB_NAME_LENGTH} characters)</p>
                  <input
                    autoFocus
                    type="text"
                    maxLength={MAX_TAB_NAME_LENGTH}
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTabName.trim()) {
                        handleCreateNewProject(newTabTargetUserId, newTabName);
                        setShowNewTabModal(false);
                      }
                    }}
                    placeholder="e.g. Client Docs, Sprint 4..."
                    className="w-full bg-transparent text-sm text-primary border border-edge rounded-xl px-4 py-3 focus:outline-none focus:border-accent/30"
                  />
                  <p className="text-[9px] tracking-widest text-muted/20 text-right">{newTabName.length}/{MAX_TAB_NAME_LENGTH}</p>
                </div>
                <p className="text-[9px] tracking-widest text-muted/30 leading-relaxed">
                  Choose a short label for this workspace tab. New project tab is added after HOME. Max {MAX_PROJECT_TABS} tabs per user.
                </p>
                <div className="flex justify-end gap-6 pt-4 border-t border-edge">
                  <button onClick={() => setShowNewTabModal(false)} className="text-[11px] tracking-[0.3em] text-muted/40 hover:text-primary transition-colors uppercase font-bold">Cancel</button>
                  <button
                    onClick={() => { handleCreateNewProject(newTabTargetUserId, newTabName); setShowNewTabModal(false); }}
                    disabled={!newTabName.trim()}
                    className="px-8 py-3 bg-accent text-contrast text-[11px] font-bold tracking-[0.3em] rounded-xl uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rename Tab Modal (z-[150]) */}
          {showRenameModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setShowRenameModal(false)}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="relative bg-card border border-edge rounded-3xl max-w-sm w-full p-8 space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] tracking-[0.3em] uppercase text-accent font-bold flex items-center gap-3">
                    <Pencil size={16} />
                    Rename Tab
                  </h2>
                  <button onClick={() => setShowRenameModal(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold">Custom Label (max {MAX_TAB_NAME_LENGTH} characters)</p>
                  <input
                    autoFocus
                    type="text"
                    maxLength={MAX_TAB_NAME_LENGTH}
                    value={renameLabel}
                    onChange={(e) => setRenameLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameProject(); }}
                    placeholder="e.g. Research, Invoices..."
                    className="w-full bg-transparent text-sm text-primary border border-edge rounded-xl px-4 py-3 focus:outline-none focus:border-accent/30"
                  />
                  <p className="text-[9px] tracking-widest text-muted/20 text-right">{renameLabel.length}/{MAX_TAB_NAME_LENGTH}</p>
                </div>
                <p className="text-[9px] tracking-widest text-muted/30 leading-relaxed">
                  Optional label for this tab. Leave empty to reset to default. System identity and sort order are unchanged.
                </p>
                <div className="flex justify-end gap-6 pt-4 border-t border-edge">
                  <button onClick={() => setShowRenameModal(false)} className="text-[11px] tracking-[0.3em] text-muted/40 hover:text-primary transition-colors uppercase font-bold">Cancel</button>
                  <button
                    onClick={handleRenameProject}
                    className="px-8 py-3 bg-accent text-contrast text-[11px] font-bold tracking-[0.3em] rounded-xl uppercase"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Share Modal (z-[150]) */}
          {shareItem && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setShareItem(null)}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="relative bg-card border border-edge rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] tracking-[0.3em] uppercase text-accent font-bold flex items-center gap-3">
                    <Users size={16} />
                    Share to Users
                  </h2>
                  <button onClick={() => setShareItem(null)} className="text-primary/30 hover:text-primary transition-colors"><X size={18} /></button>
                </div>
                <p className="text-[10px] tracking-widest text-muted/40 uppercase truncate">{shareItem.title}</p>
                <div className="flex gap-4 mb-2">
                  <button type="button" onClick={() => setShareTargetUsers(nonOwnerTabs.map(t => t.id))} className="text-[9px] tracking-widest uppercase text-accent/40 hover:text-accent font-bold transition-colors">All</button>
                  <button type="button" onClick={() => setShareTargetUsers([])} className="text-[9px] tracking-widest uppercase text-muted/30 hover:text-muted font-bold transition-colors">Clear</button>
                </div>
                <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto">
                  {nonOwnerTabs.map(tab => {
                    const selected = shareTargetUsers.includes(tab.id);
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setShareTargetUsers(prev =>
                          selected ? prev.filter(id => id !== tab.id) : [...prev, tab.id]
                        )}
                        className={`text-[10px] tracking-widest px-5 py-2.5 rounded-full border transition-all uppercase font-bold ${
                          selected
                            ? 'bg-accent/10 border-accent/30 text-accent'
                            : 'border-edge text-muted/40 hover:border-edge hover:text-muted'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-6 pt-4 border-t border-edge">
                  <button onClick={() => setShareItem(null)} className="text-[11px] tracking-[0.3em] text-muted/40 hover:text-primary transition-colors uppercase font-bold">Cancel</button>
                  <button
                    onClick={handleShareConfirm}
                    disabled={shareTargetUsers.length === 0}
                    className="px-8 py-3 bg-accent text-contrast text-[11px] font-bold tracking-[0.3em] rounded-xl uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Share ({shareTargetUsers.length})
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative z-30 flex flex-col">
          <AppHeader
            isOwnerSession={isOwnerSession}
            signedInName={signedInName}
            signedInRole={signedInRole}
            currentUserTab={currentUserTab}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            myProjects={myProjects}
            visibleTabs={visibleTabs}
            viewMode={viewMode}
            setViewMode={setViewMode}
            sectionTitle={sectionTitle}
            showThemeDock={showThemeDock}
            setShowThemeDock={setShowThemeDock}
            showMobileMenu={showMobileMenu}
            setShowMobileMenu={setShowMobileMenu}
            onOpenAES={() => setShowAES(true)}
            onOpenInfo={() => setShowInfo(true)}
            onOpenAdminSearch={() => { setShowAdminSearch(true); setAdminSearchQuery(''); }}
            onLogout={handleLogout}
            setIsAdding={setIsAdding}
            setSearchTerm={setSearchTerm}
          />

          {/* Master Admin Console — Owner-only with user search selector */}
          {isOwnerSession && activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && (
            <div className="owner-admin-console">
              <div className="user-switcher">
                <button className="admin-search-trigger" onClick={() => { setShowAdminSearch(true); setAdminSearchQuery(''); }}>
                  <Search size={14} />
                  <span>{activeTab}</span>
                </button>
              </div>
              <div className="admin-info-pane">
                <div className="status-row">
                  <span className={`status-dot ${viewedUserStatus.toLowerCase().replace(' ', '-')}`}>&#9679;</span>
                  <span>{activeTab}: {viewedUserStatus}</span>
                </div>
                <div className="metadata-row">
                  <span>LAST SEEN: {viewedUserLastSeen || 'NEVER'}</span>
                  <span>1:1 SYNC: SECURE AES-256</span>
                </div>
              </div>
              {activeTab !== 'JONO' && (
                <div className="project-tab-container admin-tab-grid">
                  {viewedUserProjects
                    .sort((a, b) => a.index - b.index)
                    .map((project) => (
                    <div key={project.id} className="tab-item-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <button
                        className={`tab-item ${activeProjectId === project.id ? 'active' : ''}`}
                        onClick={() => setActiveProjectId(project.id)}
                      >
                        {getTabLabel(project)}
                      </button>
                      {project.index !== 1 && (
                        <button
                          className="tab-rename-btn"
                          onClick={(e) => { e.stopPropagation(); openRenameModal(activeTab, project.id, project.name); }}
                          title="Rename tab"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', opacity: 0.4, transition: 'opacity 0.2s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.4')}
                        >
                          <Pencil size={10} className="text-muted" />
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Fill empty slots up to 7 */}
                  {Array.from({ length: Math.max(0, 7 - viewedUserProjects.length) }).map((_, i) => (
                    <span key={`empty-${i}`} className="tab-item tab-empty" />
                  ))}
                  <button
                    className={`tab-item chat-anchor ${isChatAnchor(activeProjectId) ? 'active' : ''}`}
                    onClick={() => setActiveProjectId(getChatAnchorId(activeTab))}
                  >
                    CHAT
                  </button>
                  <button
                    className="tab-item new-project-btn"
                    onClick={() => openNewTabModal(activeTab)}
                    title="Create new project for this user"
                  >
                    <FolderPlus size={12} /> NEW
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Admin User Search Overlay */}
          {showAdminSearch && (
            <AdminSearchOverlay
              users={TABS}
              activeTabId={activeTab}
              onSelect={(user) => {
                setActiveTab(user.id);
                setActiveProjectId(null);
                setIsAdding(false);
                setSearchTerm('');
              }}
              onClose={() => setShowAdminSearch(false)}
            />
          )}

          {/* ━━━ OS³ Console Layers — content tabs only ━━━ */}
          {activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && (
            <>
              <TelemetryStrip
                itemCount={filteredItems.length}
                userCount={TABS.filter(t => !t.isOwner).length}
                isOwner={isOwnerSession}
                activeChannel={activeTab}
              />
              <ProtocolBanner
                protocolId={isChatAnchor(activeProjectId) ? 'PROTO::COMMS' : isOwnerSession ? 'PROTO::ADMIN' : 'PROTO::USER'}
                title={sectionTitle}
                contextLabel={isChatAnchor(activeProjectId) ? 'SECURE LINK' : isOwnerSession ? 'MULTI-CHANNEL' : 'SINGLE-CHANNEL'}
                stats={!isChatAnchor(activeProjectId) ? [
                  { value: filteredItems.length, label: 'Records' },
                  { value: filteredItems.filter(i => i.type === ItemType.TASK && i.taskStatus !== TaskStatus.DONE).length, label: 'Pending' },
                ] : undefined}
              />
              <ContextBar
                tag="DATA INBOX"
                source={isChatAnchor(activeProjectId) ? 'SOURCE: SECURE_COMMS' : `SOURCE: HUB_${activeTab}`}
              />
            </>
          )}

          <ConsoleGrid controlTower={
            activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && !isChatAnchor(activeProjectId) ? (
              <ControlTower
                items={filteredItems}
                isOwner={isOwnerSession}
                activeChannel={activeTab}
                canPost={canPost}
                onNewEntry={() => { setEditingItem(null); setNewItemContent(''); setNewItemTargetProjectId(null); setEditCopyToUsers([]); setIsAdding(true); }}
                onSearch={() => { setShowAdminSearch(true); setAdminSearchQuery(''); }}
                onRefresh={() => setItems(db.getItems())}
                onResetVisibility={isOwnerSession && activeTab !== 'JONO' ? () => handleResetUserVisibility(activeTab) : undefined}
              />
            ) : undefined
          }>
          <div className="space-y-4 px-4 sm:px-0">

            {activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && !isChatAnchor(activeProjectId) && (
              <ActivityTicker items={filteredItems} />
            )}

            {activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && (
              <div className="flex justify-end">
                <SearchInput value={searchTerm} onChange={setSearchTerm} />
              </div>
            )}

            {showOwnerAdminPanels && (
              <div className="glass rounded-2xl p-6 space-y-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted/50 font-bold">JONO Pinned Announcement (fixed to top of every user tab)</p>
                <textarea
                  value={defaultNote}
                  onChange={(event) => setDefaultNote(event.target.value)}
                  placeholder="This announcement will appear as a fixed card on every user tab..."
                  className="w-full bg-transparent text-sm text-primary border border-edge rounded-xl p-4 min-h-[90px] resize-none focus:outline-none"
                />
                <p className="text-[9px] tracking-[0.15em] uppercase text-accent/70 font-bold">Appears as a read-only pinned announcement at the top of every user tab.</p>
                <div className="flex justify-end">
                  <button onClick={saveDefaultNote} className="px-6 py-2 rounded-xl bg-accent text-contrast text-[10px] tracking-[0.2em] uppercase font-bold">
                    Save Announcement
                  </button>
                </div>
              </div>
            )}

            {showOwnerAdminPanels && (
              <div className="glass rounded-2xl p-6 space-y-6">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted/50 font-bold">Invite Team Member</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Display Name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-primary border border-edge rounded-xl px-4 py-3 focus:outline-none focus:border-accent/30"
                  />
                  <input
                    type="email"
                    placeholder="user@theiremail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-primary border border-edge rounded-xl px-4 py-3 focus:outline-none focus:border-accent/30"
                  />
                  <button
                    onClick={handleInvite}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-accent text-contrast text-[10px] tracking-[0.2em] uppercase font-bold whitespace-nowrap"
                  >
                    <UserPlus size={14} />
                    Send Invite
                  </button>
                </div>
                <p className="text-[9px] tracking-[0.15em] uppercase text-muted/30 font-bold">User will appear as a new tab. First login creates their PIN.</p>

                {TABS.filter((t) => !t.isOwner).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[9px] tracking-[0.2em] uppercase text-muted/30 font-bold">Registered Users</p>
                    <div className="flex flex-wrap gap-3">
                      {TABS.filter((t) => !t.isOwner).map((t) => (
                        <div key={t.id} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-edge bg-card/10 text-[10px] tracking-[0.15em] text-muted uppercase font-bold">
                          {t.label}
                          <button
                            onClick={() => handleRemoveUser(t.email)}
                            className="text-muted/20 hover:text-red-400 transition-colors ml-1"
                            title={`Remove ${t.label}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {canPost && !isAdding && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setNewItemContent('');
                  setNewItemTargetProjectId(null);
                  setEditCopyToUsers([]);
                  setIsAdding(true);
                }}
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] text-accent/60 hover:text-accent transition-all uppercase font-bold group"
              >
                <div className="w-8 h-8 rounded-full bg-accent/5 flex items-center justify-center border border-accent/10 group-hover:bg-accent/10 transition-colors">
                  <Plus size={16} />
                </div>
                New Entry
              </button>
            )}

            {isAdding && (
              <div className="border border-edge p-12 rounded-[2.5rem] space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-4">
                    {Object.values(ItemType).map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewItemType(type)}
                        className={`text-[10px] tracking-widest px-6 py-3 rounded-full border transition-all uppercase font-bold flex items-center gap-3 ${
                          newItemType === type
                            ? 'bg-accent text-contrast border-accent'
                            : 'text-muted border-edge hover:border-edge'
                        }`}
                      >
                        {getIconForType(type)}
                        {type}
                      </button>
                    ))}
                  </div>
                  {editingItem && (
                    <span className="text-[10px] tracking-widest text-accent uppercase font-bold">Editing Mode</span>
                  )}
                </div>

                {/* Target Tab picker — choose which project tab the entry goes to */}
                {!isChatAnchor(activeProjectId) && (() => {
                  const tabProjects = isOwnerSession
                    ? (userProjectsMap[activeTab] || [])
                    : myProjects;
                  if (tabProjects.length <= 1) return null;
                  return (
                    <div className="space-y-4 border border-accent/10 rounded-2xl p-6 bg-accent/[0.02]">
                      <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold flex items-center gap-3">
                        <LayoutGrid size={14} className="text-accent/40" />
                        Target Tab
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {tabProjects
                          .sort((a, b) => a.index - b.index)
                          .map(project => {
                            const isSelected = (newItemTargetProjectId || activeProjectId) === project.id;
                            return (
                              <button
                                key={project.id}
                                type="button"
                                onClick={() => setNewItemTargetProjectId(project.id)}
                                className={`text-[10px] tracking-widest px-5 py-2.5 rounded-full border transition-all uppercase font-bold ${
                                  isSelected
                                    ? 'bg-accent/10 border-accent/30 text-accent'
                                    : 'border-edge text-muted/40 hover:border-edge hover:text-muted'
                                }`}
                              >
                                {project.name || `TAB ${project.index}`}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  );
                })()}

                {/* Copy to Users — owner only, edit mode */}
                {isOwnerSession && editingItem && nonOwnerTabs.length > 0 && (
                  <div className="space-y-4 border border-accent/10 rounded-2xl p-6 bg-accent/[0.02]">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold flex items-center gap-3">
                        <Users size={14} className="text-accent/40" />
                        Copy to Users
                      </p>
                      <div className="flex gap-6">
                        <button type="button" onClick={() => setEditCopyToUsers(nonOwnerTabs.map(t => t.id))} className="text-[9px] tracking-widest uppercase text-accent/40 hover:text-accent font-bold transition-colors">All</button>
                        <button type="button" onClick={() => setEditCopyToUsers([])} className="text-[9px] tracking-widest uppercase text-muted/30 hover:text-muted font-bold transition-colors">Clear</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {nonOwnerTabs.map(tab => {
                        const selected = editCopyToUsers.includes(tab.id);
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setEditCopyToUsers(prev => selected ? prev.filter(id => id !== tab.id) : [...prev, tab.id])}
                            className={`text-[10px] tracking-widest px-5 py-2.5 rounded-full border transition-all uppercase font-bold ${
                              selected ? 'bg-accent/10 border-accent/30 text-accent' : 'border-edge text-muted/40 hover:border-edge hover:text-muted'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                    {editCopyToUsers.length === 0 && (
                      <p className="text-[9px] tracking-widest text-muted/20 uppercase">No users selected — card updates in place only</p>
                    )}
                  </div>
                )}

                {/* Multi-user picker — owner only, new items only */}
                {isOwnerSession && !editingItem && nonOwnerTabs.length > 0 && (
                  <div className="space-y-4 border border-accent/10 rounded-2xl p-6 bg-accent/[0.02]">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold flex items-center gap-3">
                        <Users size={14} className="text-accent/40" />
                        Share to Users
                        {selectedTargetUsers.length > 0 && (
                          <span className="text-accent">({selectedTargetUsers.length})</span>
                        )}
                      </p>
                      <div className="flex gap-6">
                        <button
                          type="button"
                          onClick={() => setSelectedTargetUsers(nonOwnerTabs.map(t => t.id))}
                          className="text-[9px] tracking-widest uppercase text-accent/40 hover:text-accent font-bold transition-colors"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTargetUsers([])}
                          className="text-[9px] tracking-widest uppercase text-muted/30 hover:text-muted font-bold transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {nonOwnerTabs.map(tab => {
                        const selected = selectedTargetUsers.includes(tab.id);
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedTargetUsers(prev =>
                              selected ? prev.filter(id => id !== tab.id) : [...prev, tab.id]
                            )}
                            className={`text-[10px] tracking-widest px-5 py-2.5 rounded-full border transition-all uppercase font-bold ${
                              selected
                                ? 'bg-accent/10 border-accent/30 text-accent'
                                : 'border-edge text-muted/40 hover:border-edge hover:text-muted'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                    {selectedTargetUsers.length === 0 && (
                      <p className="text-[9px] tracking-widest text-muted/20 uppercase">No users selected — entry posts to current tab only</p>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold">
                    {newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE ? 'Target URL'
                    : newItemType === ItemType.DOCUMENT ? 'Document Title (optional)'
                    : newItemType === ItemType.IMAGE ? 'Caption (optional)'
                    : newItemType === ItemType.VIDEO ? 'Caption (optional)'
                    : 'Subject Line'}
                  </p>
                  <input
                    autoFocus
                    placeholder={
                      newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE ? 'https://...'
                      : newItemType === ItemType.DOCUMENT ? 'Leave blank to use filename'
                      : newItemType === ItemType.IMAGE || newItemType === ItemType.VIDEO ? 'Leave blank to use filename'
                      : 'Entry Subject'
                    }
                    value={newItemTitle}
                    onChange={(event) => setNewItemTitle(event.target.value)}
                    className="w-full bg-transparent border-b border-edge py-5 text-2xl font-light text-primary focus:outline-none"
                  />
                </div>

                {/* Document file picker */}
                {newItemType === ItemType.DOCUMENT && (
                  <div className="space-y-4">
                    <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold">File</p>
                    <label className={`flex items-center gap-6 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                      newItemFile
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-edge hover:border-edge hover:bg-card/10'
                    }`}>
                      <input
                        type="file"
                        accept={ACCEPTED_EXTENSIONS}
                        className="hidden"
                        onChange={(e) => setNewItemFile(e.target.files?.[0] ?? null)}
                      />
                      <div className="w-12 h-12 rounded-xl bg-card/10 flex items-center justify-center shrink-0">
                        {newItemFile ? (
                          <span className="text-xl">{getFileIcon(newItemFile.name)}</span>
                        ) : (
                          <Upload size={20} className="text-primary/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {newItemFile ? (
                          <>
                            <p className="text-sm text-primary font-medium truncate">{newItemFile.name}</p>
                            <p className="text-[10px] text-muted/50 tracking-widest uppercase mt-1">{formatFileSize(newItemFile.size)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted/50">Click to select a file</p>
                            <p className="text-[10px] text-muted/30 tracking-widest uppercase mt-1">PDF, DOC, XLS, PPT, TXT — max 20 MB</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                {/* Image file picker */}
                {newItemType === ItemType.IMAGE && (
                  <div className="space-y-4">
                    <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold">Image File</p>
                    <label className={`flex items-center gap-6 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                      newItemFile ? 'border-accent/40 bg-accent/5' : 'border-edge hover:border-edge hover:bg-card/10'
                    }`}>
                      <input
                        type="file"
                        accept={ACCEPTED_IMAGE_EXTENSIONS}
                        className="hidden"
                        onChange={(e) => setNewItemFile(e.target.files?.[0] ?? null)}
                      />
                      {newItemFile ? (
                        <img
                          src={URL.createObjectURL(newItemFile)}
                          alt=""
                          className="w-16 h-16 rounded-xl object-cover border border-edge shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-card/10 flex items-center justify-center shrink-0">
                          <ImageIcon size={20} className="text-primary/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {newItemFile ? (
                          <>
                            <p className="text-sm text-primary font-medium truncate">{newItemFile.name}</p>
                            <p className="text-[10px] text-muted/50 tracking-widest uppercase mt-1">{formatFileSize(newItemFile.size)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted/50">Click to select an image</p>
                            <p className="text-[10px] text-muted/30 tracking-widest uppercase mt-1">JPG, PNG, GIF, WEBP, SVG — max 50 MB</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                {/* Video file picker */}
                {newItemType === ItemType.VIDEO && (
                  <div className="space-y-4">
                    <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold">Video File</p>
                    <label className={`flex items-center gap-6 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                      newItemFile ? 'border-accent/40 bg-accent/5' : 'border-edge hover:border-edge hover:bg-card/10'
                    }`}>
                      <input
                        type="file"
                        accept={ACCEPTED_VIDEO_EXTENSIONS}
                        className="hidden"
                        onChange={(e) => setNewItemFile(e.target.files?.[0] ?? null)}
                      />
                      <div className="w-12 h-12 rounded-xl bg-card/10 flex items-center justify-center shrink-0">
                        {newItemFile ? (
                          <span className="text-2xl">🎬</span>
                        ) : (
                          <VideoIcon size={20} className="text-primary/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {newItemFile ? (
                          <>
                            <p className="text-sm text-primary font-medium truncate">{newItemFile.name}</p>
                            <p className="text-[10px] text-muted/50 tracking-widest uppercase mt-1">{formatFileSize(newItemFile.size)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted/50">Click to select a video</p>
                            <p className="text-[10px] text-muted/30 tracking-widest uppercase mt-1">MP4, MOV, WEBM, AVI, MKV — max 50 MB</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-[9px] tracking-widest text-muted/40 uppercase font-bold">
                    {newItemType === ItemType.DOCUMENT ? 'Notes / Description'
                    : newItemType === ItemType.IMAGE || newItemType === ItemType.VIDEO ? 'Caption / Notes'
                    : 'Notes'}
                  </p>
                  <textarea
                    placeholder={
                      newItemType === ItemType.YOUTUBE || newItemType === ItemType.WEBPAGE
                        ? 'Add a description or notes about this link...'
                        : newItemType === ItemType.DOCUMENT
                        ? 'Add context or notes about this document...'
                        : newItemType === ItemType.IMAGE
                        ? 'Describe this image...'
                        : newItemType === ItemType.VIDEO
                        ? 'Describe this video...'
                        : 'Write note...'
                    }
                    value={newItemContent}
                    onChange={(event) => setNewItemContent(event.target.value)}
                    className="w-full bg-transparent text-lg font-light text-muted focus:outline-none min-h-[160px] resize-none leading-relaxed"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-10">
                  {(newItemType === ItemType.TASK || newItemType === ItemType.EVENT) && (
                    <div className="flex items-center gap-4 text-muted/40">
                      <Calendar size={18} />
                      <input
                        type="datetime-local"
                        value={newItemDueDate}
                        onChange={(event) => setNewItemDueDate(event.target.value)}
                        className="bg-card/10 px-4 py-2 rounded-lg border border-edge text-xs tracking-widest uppercase focus:outline-none text-muted"
                      />
                    </div>
                  )}

                  {newItemType === ItemType.EVENT && (
                    <div className="flex items-center gap-4 text-muted/40 flex-1">
                      <MapPin size={18} />
                      <input
                        type="text"
                        placeholder="Location"
                        value={newItemLocation}
                        onChange={(event) => setNewItemLocation(event.target.value)}
                        className="w-full bg-card/10 px-4 py-2 rounded-lg border border-edge text-xs tracking-widest uppercase focus:outline-none text-muted"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setNewItemIsDemo(!newItemIsDemo)}
                    className={`flex items-center gap-3 px-6 py-2.5 rounded-xl border text-[10px] tracking-widest uppercase font-bold transition-all ${
                      newItemIsDemo
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-card/10 border-edge text-muted/40'
                    }`}
                  >
                    <Rocket size={14} />
                    Demo Asset
                  </button>
                </div>

                <div className="flex justify-end gap-10 pt-10 border-t border-edge">
                  <button onClick={() => { setIsAdding(false); setEditingItem(null); setNewItemFile(null); }} className="text-[11px] tracking-[0.3em] text-muted/40 hover:text-primary transition-colors uppercase font-bold">
                    Discard
                  </button>
                  <button
                    onClick={handleCommit}
                    disabled={isUploading}
                    className="inline-flex items-center gap-3 px-14 h-14 bg-accent text-contrast text-[11px] font-bold tracking-[0.3em] rounded-[1.25rem] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading && <Loader2 size={16} className="animate-spin" />}
                    {isUploading ? 'Uploading...' : editingItem ? 'Apply Updates' : 'Commit Entry'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === DEMO_TAB_ID ? (
              <DemoTab items={items} />
            ) : activeTab === SETTINGS_TAB_ID ? (
              <SettingsTab session={session} onResetPin={handleResetPin} />
            ) : isChatAnchor(activeProjectId) && isOwnerSession ? (
              <OwnerCommsHub
                items={items}
                currentUser={session.email}
                tabs={TABS}
                onSend={handleCommsSend}
                onSwitchToUser={(userId) => { setActiveTab(userId); setActiveProjectId(null); }}
              />
            ) : isChatAnchor(activeProjectId) ? (
              <ChatWindow
                messages={filteredItems}
                currentUser={session.email}
                onSend={handleSendChat}
                peerLabel={TABS.find(t => t.id === activeTab)?.label}
              />
            ) : (
              <>
                {activeTab !== 'JONO' && defaultNote.trim() && (
                  <div className="announcement-fixed rounded-[2rem] p-8 space-y-4">
                    <div className="flex items-center gap-6">
                      <h4 className="text-[11px] tracking-[0.4em] text-accent/60 uppercase font-bold">JONO Pinned Announcement</h4>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-accent/10 to-transparent" />
                    </div>
                    <p className="text-sm text-primary/80 whitespace-pre-wrap leading-relaxed">{defaultNote}</p>
                    <div className="announcement-tag pt-4 border-t border-accent/10">
                      Pinned by JONO — Read Only
                    </div>
                  </div>
                )}

                <PinboardLane
                  items={filteredItems}
                  currentUser={session.email}
                  canManageAll={isOwnerSession}
                  viewMode={viewMode}
                  onUpdate={(id, updates) => {
                    db.updateItem(id, session.email, updates);
                    setItems(db.getItems());
                    const item = items.find(i => i.id === id);
                    const boardId = item?.boardId || activeBoardId;
                    if (updates.isArchived) {
                      logBoardActivity(boardId, session.email, 'item_archived', id);
                    } else if (updates.boardPosition !== undefined) {
                      logBoardActivity(boardId, session.email, 'item_moved', id);
                    } else {
                      logBoardActivity(boardId, session.email, 'item_updated', id);
                    }
                  }}
                  onDelete={(id) => {
                    const item = items.find(i => i.id === id);
                    db.deleteItem(id, session.email);
                    setItems(db.getItems());
                    logBoardActivity(item?.boardId || activeBoardId, session.email, 'item_deleted', id);
                  }}
                  onEdit={handleEdit}
                  onRefresh={handleRefresh}
                  onShare={isOwnerSession ? handleOpenShare : undefined}
                  onResetVisibility={isOwnerSession && activeTab !== 'JONO' ? (id) => { db.updateItem(id, session.email, { readBy: [] }); setItems(db.getItems()); showToast('Visibility reset', 'success'); } : undefined}
                />
              </>
            )}
          </div>
          </ConsoleGrid>

          <footer className="mt-8 pb-16 text-center space-y-1">
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted/30 font-bold">&copy; 2026 JB³Ai. All Rights Reserved.</p>
            <p className="text-[8px] tracking-[0.2em] text-muted/20 font-mono">v{__APP_VERSION__} &middot; {__COMMIT_HASH__}</p>
          </footer>
        </div>

        {/* Scroll-to-top FAB */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-[140] w-12 h-12 rounded-full bg-card border border-edge text-muted/60 hover:text-accent hover:border-accent/40 transition-all shadow-lg flex items-center justify-center backdrop-blur-md"
            title="Back to top"
          >
            <ArrowUp size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Material Theme Dock — shown on clipboard tabs, not on SETTINGS or DEMO */}
      {showThemeDock && <ThemeDock />}
    </SessionGuard>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppInner />
  </ToastProvider>
);

export default App;
