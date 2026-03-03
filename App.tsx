import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SessionGuard } from './components/SessionGuard';
import { PinboardLane } from './components/PinboardLane';
import { DemoTab } from './components/DemoTab';
import { SettingsTab } from './components/SettingsTab';
import { LinkPasteBar } from './components/LinkPasteBar';
import { SearchInput } from './components/SearchInput';
import { ToastProvider, useToast } from './components/Toast';
import { db } from './services/db';
import { userRegistry } from './services/userRegistry';
import { supabaseAuth } from './services/auth';
import { fetchLinkMetadata } from './services/metadata';
import { ClipboardItem, UserEmail, ItemType, TaskStatus, EnrichmentStatus, UserSession } from './types';
import { OWNER_EMAIL } from './constants';
import { LogOut, Plus, Calendar, MapPin, Youtube, Globe, FileText, CheckSquare, Rocket, UserPlus, Trash2 } from 'lucide-react';

const DEFAULT_NOTE_KEY = 'jb3_default_note_all';

const DEMO_TAB_ID = '__DEMO__';
const SETTINGS_TAB_ID = '__SETTINGS__';

const AppInner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('JONO');
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

  useEffect(() => {
    const localItems = db.getItems();
    setItems(localItems);
    setDefaultNote(localStorage.getItem(DEFAULT_NOTE_KEY) || '');

    db.hydrateFromCloud()
      .then((cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          setItems(cloudItems);
        }
      })
      .catch(() => undefined);
  }, []);

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

  useEffect(() => {
    if (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID) return;

    const unreadFromOtherSide = items.filter((item) => {
      const inThisSyncTab = item.syncTabId === activeTab;
      const fromOtherUser = item.userId !== session.email;
      const notReadYet = !(item.readBy || []).includes(session.email);
      return inThisSyncTab && fromOtherUser && notReadYet;
    });

    if (unreadFromOtherSide.length === 0) return;

    unreadFromOtherSide.forEach((item) => db.markAsRead(item.id, session.email));
    setItems(db.getItems());
  }, [activeTab, items.length, session.email]);

  const handleLogout = () => {
    localStorage.removeItem('jb3_session');
    window.location.reload();
  };

  const handleResetPin = async () => {
    await supabaseAuth.resetPin(session.email);
    localStorage.removeItem('jb3_session');
    window.location.reload();
  };

  const saveDefaultNote = () => {
    localStorage.setItem(DEFAULT_NOTE_KEY, defaultNote);
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



  const getActiveSyncTabId = () => (activeTab === 'JONO' || activeTab === DEMO_TAB_ID || activeTab === SETTINGS_TAB_ID ? undefined : activeTab);

  const canPost = activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && (isOwnerSession || activeTab === currentUserTab?.id);

  if (!isOwnerSession && !currentUserTab) {
    return (
      <SessionGuard>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#9AA3AD]/60 font-bold">No user tab assigned to this login</p>
          <button onClick={handleLogout} className="px-6 py-3 rounded-xl border border-white/20 text-[10px] tracking-[0.2em] uppercase text-white/70 hover:text-white">
            Sign Out
          </button>
        </div>
      </SessionGuard>
    );
  }

  const handleEdit = (item: ClipboardItem) => {
    setEditingItem(item);
    setNewItemType(item.type);

    if (item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) {
      setNewItemTitle(item.content);
      setNewItemContent(item.metadata?.description || '');
    } else {
      setNewItemTitle(item.title);
      setNewItemContent(item.content);
    }

    setNewItemDueDate(item.dueDate || '');
    setNewItemLocation(item.eventLocation || '');
    setNewItemIsDemo(item.isDemo || false);
    setIsAdding(true);
  };

  const handleAddLink = async (url: string, explicitType?: ItemType, manualNote?: string) => {
    let hostname = 'LINK';
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url.split('/')[2] || 'LINK';
    }

    const finalType = explicitType || (url.includes('youtube.com') || url.includes('youtu.be') ? ItemType.YOUTUBE : ItemType.WEBPAGE);
    const syncTabId = getActiveSyncTabId();

    const item = db.addItem({
      userId: session.email,
      syncTabId,
      type: finalType,
      title: hostname,
      content: url,
      enrichmentStatus: EnrichmentStatus.PENDING,
      metadata: manualNote ? { description: manualNote } : {}
    });

    setItems(db.getItems());

    try {
      const metadata = await fetchLinkMetadata(url);
      const hasMetadata = metadata && Object.keys(metadata).length > 0 && (metadata.title || metadata.siteName || metadata.og_image_url);

      const finalMetadata = hasMetadata
        ? { ...metadata, description: manualNote || metadata.description }
        : (manualNote ? { description: manualNote } : {});

      db.updateItem(item.id, session.email, {
        metadata: finalMetadata,
        enrichmentStatus: hasMetadata ? EnrichmentStatus.SUCCESS : EnrichmentStatus.FAILED
      });
    } catch {
      db.updateItem(item.id, session.email, {
        enrichmentStatus: EnrichmentStatus.FAILED
      });
    } finally {
      setItems(db.getItems());
    }
  };

  const filteredItems = useMemo(() => {
    let baseItems: ClipboardItem[] = [];

    if (activeTab === 'JONO') {
      baseItems = items.filter((item) => item.userId === OWNER_EMAIL && !item.syncTabId);
    } else {
      baseItems = items.filter((item) => item.syncTabId === activeTab);
    }

    return baseItems.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        item.title?.toLowerCase().includes(term) ||
        item.content?.toLowerCase().includes(term) ||
        (item.metadata?.title || '').toLowerCase().includes(term) ||
        (item.metadata?.description || '').toLowerCase().includes(term);

      return !item.isArchived && matchesSearch;
    });
  }, [items, activeTab, searchTerm]);

  const getIconForType = (type: ItemType) => {
    switch (type) {
      case ItemType.NOTE: return <FileText size={14} />;
      case ItemType.TASK: return <CheckSquare size={14} />;
      case ItemType.EVENT: return <Calendar size={14} />;
      case ItemType.WEBPAGE: return <Globe size={14} />;
      case ItemType.YOUTUBE: return <Youtube size={14} />;
      default: return <Plus size={14} />;
    }
  };

  const handleRefresh = async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    db.updateItem(id, session.email, {
      enrichmentStatus: EnrichmentStatus.PENDING,
      preview_fail_count: (item.preview_fail_count || 0) + 1
    });

    setItems(db.getItems());

    try {
      const metadata = await fetchLinkMetadata(item.content);
      const hasMetadata = metadata && Object.keys(metadata).length > 0 && (metadata.title || metadata.siteName || metadata.og_image_url);

      db.updateItem(id, session.email, {
        metadata: hasMetadata ? { ...item.metadata, ...metadata } : item.metadata,
        enrichmentStatus: hasMetadata ? EnrichmentStatus.SUCCESS : EnrichmentStatus.FAILED,
        preview_last_fetched_at: Date.now(),
        preview_next_allowed_at: Date.now() + 60000
      });
    } catch {
      db.updateItem(id, session.email, {
        enrichmentStatus: EnrichmentStatus.FAILED,
        preview_last_fetched_at: Date.now(),
        preview_next_allowed_at: Date.now() + 60000
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
      } else {
        updates.title = newItemTitle || 'Untitled Log';
        updates.content = newItemContent;
      }

      db.updateItem(editingItem.id, session.email, updates);
      setEditingItem(null);
    } else {
      if (newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE) {
        await handleAddLink(newItemTitle, newItemType, newItemContent);
      } else {
        db.addItem({
          userId: session.email,
          syncTabId: getActiveSyncTabId(),
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

    setItems(db.getItems());
    setIsAdding(false);
    setNewItemTitle('');
    setNewItemContent('');
    setNewItemDueDate('');
    setNewItemLocation('');
  };

  const sectionTitle = activeTab === 'JONO'
    ? 'OWNER MAIN CLIPBOARD: JONO'
    : activeTab === DEMO_TAB_ID
      ? 'DEMO PROJECT SHOWCASE'
      : activeTab === SETTINGS_TAB_ID
        ? 'INTERFACE SETTINGS'
      : `1:1 SYNC CHANNEL: JONO ↔ ${activeTab}`;

  const signedInName = (currentUserTab?.label || session.email.split('@')[0] || 'USER').toUpperCase();
  const signedInRole = isOwnerSession ? 'OWNER ACCESS' : 'USER ACCESS';

  return (
    <SessionGuard>
        <div className="relative z-10 flex flex-col gap-16 px-4 sm:px-8 py-8 bg-[#0A0C10] min-h-screen">
          <nav className="flex flex-col sm:flex-row items-center justify-between border border-white/10 rounded-2xl px-4 sm:px-6 py-4 gap-6 bg-[#121620]">
            <div className="flex gap-8 sm:gap-12 w-full sm:w-auto items-center overflow-x-auto no-scrollbar">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsAdding(false); setSearchTerm(''); }}
                  className={`text-[10px] sm:text-[11px] tracking-[0.3em] uppercase transition-all pb-6 -mb-6 border-b-2 font-bold whitespace-nowrap ${
                    activeTab === tab.id ? 'text-[#66FF66] border-[#66FF66]' : 'text-[#C6CED8] border-transparent hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => { setActiveTab(DEMO_TAB_ID); setIsAdding(false); setSearchTerm(''); }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[11px] sm:text-[12px] tracking-[0.24em] uppercase transition-all font-bold whitespace-nowrap ${
                  activeTab === DEMO_TAB_ID
                    ? 'text-[#66FF66] border-[#66FF66]/70 bg-[#66FF66]/15 shadow-[0_0_24px_rgba(102,255,102,0.35)]'
                    : 'text-[#66FF66]/90 border-[#66FF66]/30 bg-[#66FF66]/10 hover:bg-[#66FF66]/15 hover:border-[#66FF66]/60 shadow-[0_0_18px_rgba(102,255,102,0.18)]'
                }`}
              >
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#66FF66] opacity-70" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#66FF66]" />
                </span>
                DEMO
              </button>
              <button
                onClick={() => { setActiveTab(SETTINGS_TAB_ID); setIsAdding(false); setSearchTerm(''); }}
                className={`text-[10px] sm:text-[11px] tracking-[0.3em] uppercase transition-all pb-6 -mb-6 border-b-2 font-bold whitespace-nowrap ${
                  activeTab === SETTINGS_TAB_ID ? 'text-[#66FF66] border-[#66FF66]' : 'text-[#C6CED8] border-transparent hover:text-white'
                }`}
              >
                SETTINGS
              </button>
            </div>

            <div className="flex items-center gap-6 w-full sm:w-auto justify-end">
              <button onClick={handleLogout} title="Terminate Session" className="text-[#9AA3AD]/40 hover:text-red-400 transition-colors">
                <LogOut size={18} strokeWidth={1.5} />
              </button>
            </div>
          </nav>

          <div className="min-h-[60vh] space-y-12">
            <div className="border border-white/10 rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#E6E6E6] font-bold">Welcome, {signedInName}</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-[#66FF66]/70 font-bold">{signedInRole}</div>
            </div>

            <div className="text-[10px] tracking-[0.3em] uppercase text-[#C6CED8] font-bold">{sectionTitle}</div>

            {activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && (
              <div className="flex flex-col lg:flex-row gap-8 items-end justify-between">
                <div className="flex-1 w-full max-w-2xl">
                  {canPost ? (
                    <LinkPasteBar onAdd={handleAddLink} />
                  ) : (
                    <div className="h-16 flex items-center px-8 rounded-2xl text-[11px] tracking-[0.3em] text-[#9AA3AD]/30 uppercase font-bold border border-white/10">
                      Read-only sync view
                    </div>
                  )}
                </div>
                <SearchInput value={searchTerm} onChange={setSearchTerm} />
              </div>
            )}

            {isOwnerSession && activeTab === 'JONO' && (
              <div className="border border-white/10 rounded-2xl p-6 space-y-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#9AA3AD]/50 font-bold">JONO default note (pinned to top of every user tab)</p>
                <textarea
                  value={defaultNote}
                  onChange={(event) => setDefaultNote(event.target.value)}
                  placeholder="This note will appear as a pinned card on every user tab..."
                  className="w-full bg-transparent text-sm text-[#E6E6E6] border border-white/10 rounded-xl p-4 min-h-[90px] resize-none focus:outline-none"
                />
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#66FF66]/70 font-bold">Appears as a read-only pinned note at the top of every user tab.</p>
                <div className="flex justify-end">
                  <button onClick={saveDefaultNote} className="px-6 py-2 rounded-xl bg-[#66FF66] text-black text-[10px] tracking-[0.2em] uppercase font-bold">
                    Save Default Note
                  </button>
                </div>
              </div>
            )}

            {isOwnerSession && activeTab === 'JONO' && (
              <div className="border border-white/10 rounded-2xl p-6 space-y-6">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#9AA3AD]/50 font-bold">Invite Team Member</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Display Name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-[#E6E6E6] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#66FF66]/30"
                  />
                  <input
                    type="email"
                    placeholder="user@theiremail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-[#E6E6E6] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#66FF66]/30"
                  />
                  <button
                    onClick={handleInvite}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[#66FF66] text-black text-[10px] tracking-[0.2em] uppercase font-bold whitespace-nowrap"
                  >
                    <UserPlus size={14} />
                    Send Invite
                  </button>
                </div>
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#9AA3AD]/30 font-bold">User will appear as a new tab. First login creates their PIN.</p>

                {TABS.filter((t) => !t.isOwner).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[9px] tracking-[0.2em] uppercase text-[#9AA3AD]/30 font-bold">Registered Users</p>
                    <div className="flex flex-wrap gap-3">
                      {TABS.filter((t) => !t.isOwner).map((t) => (
                        <div key={t.id} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-[10px] tracking-[0.15em] text-[#C6CED8] uppercase font-bold">
                          {t.label}
                          <button
                            onClick={() => handleRemoveUser(t.email)}
                            className="text-[#9AA3AD]/20 hover:text-red-400 transition-colors ml-1"
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
                  setIsAdding(true);
                }}
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] text-[#66FF66]/60 hover:text-[#66FF66] transition-all uppercase font-bold group"
              >
                <div className="w-8 h-8 rounded-full bg-[#66FF66]/5 flex items-center justify-center border border-[#66FF66]/10 group-hover:bg-[#66FF66]/10 transition-colors">
                  <Plus size={16} />
                </div>
                New Entry
              </button>
            )}

            {isAdding && (
              <div className="border border-white/10 p-12 rounded-[2.5rem] space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-4">
                    {Object.values(ItemType).map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewItemType(type)}
                        className={`text-[10px] tracking-widest px-6 py-3 rounded-full border transition-all uppercase font-bold flex items-center gap-3 ${
                          newItemType === type
                            ? 'bg-[#66FF66] text-black border-[#66FF66]'
                            : 'text-[#9AA3AD] border-white/10 hover:border-white/20'
                        }`}
                      >
                        {getIconForType(type)}
                        {type}
                      </button>
                    ))}
                  </div>
                  {editingItem && (
                    <span className="text-[10px] tracking-widest text-[#66FF66] uppercase font-bold">Editing Mode</span>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-[9px] tracking-widest text-[#9AA3AD]/40 uppercase font-bold">
                    {newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE ? 'Target URL' : 'Subject Line'}
                  </p>
                  <input
                    autoFocus
                    placeholder={newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE ? 'https://...' : 'Entry Subject'}
                    value={newItemTitle}
                    onChange={(event) => setNewItemTitle(event.target.value)}
                    className="w-full bg-transparent border-b border-white/10 py-5 text-2xl font-light text-[#E6E6E6] focus:outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-[9px] tracking-widest text-[#9AA3AD]/40 uppercase font-bold">Notes</p>
                  <textarea
                    placeholder={newItemType === ItemType.YOUTUBE || newItemType === ItemType.WEBPAGE ? 'Add a description or notes about this link...' : 'Write note...'}
                    value={newItemContent}
                    onChange={(event) => setNewItemContent(event.target.value)}
                    className="w-full bg-transparent text-lg font-light text-[#9AA3AD] focus:outline-none min-h-[160px] resize-none leading-relaxed"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-10">
                  {(newItemType === ItemType.TASK || newItemType === ItemType.EVENT) && (
                    <div className="flex items-center gap-4 text-[#9AA3AD]/40">
                      <Calendar size={18} />
                      <input
                        type="datetime-local"
                        value={newItemDueDate}
                        onChange={(event) => setNewItemDueDate(event.target.value)}
                        className="bg-white/5 px-4 py-2 rounded-lg border border-white/10 text-xs tracking-widest uppercase focus:outline-none text-[#9AA3AD]"
                      />
                    </div>
                  )}

                  {newItemType === ItemType.EVENT && (
                    <div className="flex items-center gap-4 text-[#9AA3AD]/40 flex-1">
                      <MapPin size={18} />
                      <input
                        type="text"
                        placeholder="Location"
                        value={newItemLocation}
                        onChange={(event) => setNewItemLocation(event.target.value)}
                        className="w-full bg-white/5 px-4 py-2 rounded-lg border border-white/10 text-xs tracking-widest uppercase focus:outline-none text-[#9AA3AD]"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setNewItemIsDemo(!newItemIsDemo)}
                    className={`flex items-center gap-3 px-6 py-2.5 rounded-xl border text-[10px] tracking-widest uppercase font-bold transition-all ${
                      newItemIsDemo
                        ? 'bg-[#66FF66]/10 border-[#66FF66]/30 text-[#66FF66]'
                        : 'bg-white/5 border-white/10 text-[#9AA3AD]/40'
                    }`}
                  >
                    <Rocket size={14} />
                    Demo Asset
                  </button>
                </div>

                <div className="flex justify-end gap-10 pt-10 border-t border-white/[0.04]">
                  <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="text-[11px] tracking-[0.3em] text-[#9AA3AD]/40 hover:text-white transition-colors uppercase font-bold">
                    Discard
                  </button>
                  <button onClick={handleCommit} className="px-14 h-14 bg-[#66FF66] text-black text-[11px] font-bold tracking-[0.3em] rounded-[1.25rem] uppercase">
                    {editingItem ? 'Apply Updates' : 'Commit Entry'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === DEMO_TAB_ID ? (
              <DemoTab items={items} />
            ) : activeTab === SETTINGS_TAB_ID ? (
              <SettingsTab session={session} onResetPin={handleResetPin} />
            ) : (
              <>
                {activeTab !== 'JONO' && defaultNote.trim() && (
                  <div className="space-y-10">
                    <div className="flex items-center gap-6">
                      <h4 className="text-[11px] tracking-[0.4em] text-[#66FF66]/60 uppercase font-bold">JONO Standard Note</h4>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-[#66FF66]/10 to-transparent" />
                    </div>
                    <div className="border border-[#66FF66]/20 rounded-[2rem] p-8 bg-[#66FF66]/[0.03] relative">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-[#66FF66]/60" />
                        <span className="text-[9px] tracking-[0.3em] uppercase text-[#66FF66]/50 font-bold">Pinned by JONO — Read Only</span>
                      </div>
                      <p className="text-sm text-[#E6E6E6]/80 whitespace-pre-wrap leading-relaxed">{defaultNote}</p>
                    </div>
                  </div>
                )}

                <PinboardLane
                  items={filteredItems}
                  currentUser={session.email}
                  canManageAll={isOwnerSession}
                  onUpdate={(id, updates) => { db.updateItem(id, session.email, updates); setItems(db.getItems()); }}
                  onDelete={(id) => { db.deleteItem(id, session.email); setItems(db.getItems()); }}
                  onEdit={handleEdit}
                  onRefresh={handleRefresh}
                />
              </>
            )}
          </div>
        </div>
      </SessionGuard>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppInner />
  </ToastProvider>
);

export default App;
