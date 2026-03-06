import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SessionGuard } from './components/SessionGuard';
import { PinboardLane } from './components/PinboardLane';
import { DemoTab } from './components/DemoTab';
import { SettingsTab } from './components/SettingsTab';
import { SearchInput } from './components/SearchInput';
import { ToastProvider, useToast } from './components/Toast';
import { db } from './services/db';
import { userRegistry, hydrateRegistryFromCloud } from './services/userRegistry';
import { supabaseAuth } from './services/auth';
import { fetchLinkMetadata } from './services/metadata';
import { ClipboardItem, UserEmail, ItemType, TaskStatus, EnrichmentStatus, UserSession } from './types';
import { OWNER_EMAIL } from './constants';
import { LogOut, Plus, Calendar, MapPin, Youtube, Globe, FileText, CheckSquare, Rocket, UserPlus, Trash2, FileArchive, Upload, Loader2, Image as ImageIcon, Video as VideoIcon, Info, X, Users } from 'lucide-react';
import { uploadDocument, formatFileSize, getFileIcon, ACCEPTED_EXTENSIONS } from './services/documentService';
import { uploadMedia, ACCEPTED_IMAGE_EXTENSIONS, ACCEPTED_VIDEO_EXTENSIONS } from './services/mediaService';

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
  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedTargetUsers, setSelectedTargetUsers] = useState<string[]>([]);

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

  useEffect(() => {
    const localItems = db.getItems();
    setItems(localItems);
    setDefaultNote(localStorage.getItem(DEFAULT_NOTE_KEY) || '');

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
      setEditingItem(null);
    } else if (isOwnerSession && selectedTargetUsers.length > 0) {
      // ─── Multi-user batch path ───
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
        }, selectedTargetUsers);

        setItems(db.getItems());

        try {
          const metadata = await fetchLinkMetadata(url);
          const hasMetadata = metadata && Object.keys(metadata).length > 0 && (metadata.title || metadata.siteName || metadata.og_image_url);
          const finalMetadata = hasMetadata
            ? { ...metadata, description: newItemContent || metadata.description }
            : (newItemContent ? { description: newItemContent } : {});
          const status = hasMetadata ? EnrichmentStatus.SUCCESS : EnrichmentStatus.FAILED;
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
          }, selectedTargetUsers);
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
          }, selectedTargetUsers);
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
        }, selectedTargetUsers);
      }

      showToast(`Entry shared to ${selectedTargetUsers.length} user${selectedTargetUsers.length > 1 ? 's' : ''}`, 'success');
    } else {
      if (newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE) {
        await handleAddLink(newItemTitle, newItemType, newItemContent);
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
          db.addItem({
            userId: session.email,
            syncTabId: getActiveSyncTabId(),
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
          db.addItem({
            userId: session.email,
            syncTabId: getActiveSyncTabId(),
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
    setNewItemFile(null);
    setSelectedTargetUsers([]);
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
        <div className="relative min-h-screen">
          {/* Fixed background — stays put while content scrolls */}
          <div
            className="fixed inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: `url('${import.meta.env.BASE_URL}Media/background.webp')` }}
          />
          {/* Theme-aware overlay so UI stays readable */}
          <div className="fixed inset-0" style={{ backgroundColor: 'var(--bg-dark)', opacity: 0.75 }} />
          <div className="fixed inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

          {/* Info Modal */}
          {showInfo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowInfo(false)}>
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
                    OS³ Clipboard is a shared clipboard for the JB3 team. Each team member has their own tab where they can post notes, links, tasks, events, documents, images, and videos — all synced in real time via Supabase.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">How to add items</h3>
                  <ul className="text-[13px] text-primary/40 leading-relaxed font-light space-y-2 list-none">
                    <li className="flex gap-3"><span className="text-accent/60">1.</span> Paste a URL into the link bar to auto-detect YouTube or webpage links</li>
                    <li className="flex gap-3"><span className="text-accent/60">2.</span> Click the <span className="text-primary/60">+</span> button to create a Note, Task, Event, Document, Image, or Video</li>
                    <li className="flex gap-3"><span className="text-accent/60">3.</span> Documents (PDF, DOC, XLS, etc.) up to 20 MB</li>
                    <li className="flex gap-3"><span className="text-accent/60">4.</span> Images (JPG, PNG, GIF, WEBP) and Videos (MP4, MOV, WEBM) up to 50 MB</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Card actions</h3>
                  <ul className="text-[13px] text-primary/40 leading-relaxed font-light space-y-2 list-none">
                    <li className="flex gap-3"><span className="text-yellow-400/60">Pin</span> — Keep a card at the top of the board</li>
                    <li className="flex gap-3"><span className="text-blue-400/60">Edit</span> — Modify title, notes, or replace files</li>
                    <li className="flex gap-3"><span className="text-red-400/60">Delete</span> — Remove a card (owner only for other users' tabs)</li>
                    <li className="flex gap-3"><span className="text-purple-400/60">Archive</span> — Hide a card without deleting it</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Tabs</h3>
                  <ul className="text-[13px] text-primary/40 leading-relaxed font-light space-y-2 list-none">
                    <li className="flex gap-3"><span className="text-primary/60">User tabs</span> — Each team member's personal board (scroll left/right)</li>
                    <li className="flex gap-3"><span className="text-accent/60">DEMO</span> — Shared showcase tab viewable by everyone</li>
                    <li className="flex gap-3"><span className="text-primary/60">SETTINGS</span> — Change PIN, theme, and font size</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] tracking-[0.25em] uppercase text-primary/50 font-bold">Owner features</h3>
                  <p className="text-[13px] text-primary/40 leading-relaxed font-light">
                    The owner can view and post to all tabs, invite or remove team members, and manage the full board. Regular users only see their own tab, DEMO, and Settings.
                  </p>
                </section>

                <div className="h-[1px] bg-card/20" />
                <p className="text-[10px] tracking-[0.2em] text-primary/20 text-center uppercase">JB3 AI &middot; OS³ Clipboard v1</p>
              </div>
            </div>
          )}

          <div className="relative z-10 flex flex-col gap-16 px-4 sm:px-8 py-8">
          <nav className="flex items-center border border-edge rounded-2xl px-4 sm:px-6 py-4 gap-4 bg-card">
            {/* OS3 header badge */}
            <img src={`${import.meta.env.BASE_URL}Media/landscape_header_icon.jpg`} alt="OS³ JB3Ai" className="h-10 rounded-lg object-contain flex-shrink-0" />
            {/* Scrollable user tabs */}
            <div className="flex-1 min-w-0 overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--accent)40 transparent' }}>
              <div className="flex gap-6 sm:gap-10 items-center w-max pr-4">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setIsAdding(false); setSearchTerm(''); }}
                    className={`text-[10px] sm:text-[11px] tracking-[0.3em] uppercase transition-all pb-6 -mb-6 border-b-2 font-bold whitespace-nowrap ${
                      activeTab === tab.id ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned utility buttons — always visible */}
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 border-l border-edge pl-4">
              <button
                onClick={() => { setActiveTab(DEMO_TAB_ID); setIsAdding(false); setSearchTerm(''); }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] sm:text-[11px] tracking-[0.24em] uppercase transition-all font-bold whitespace-nowrap ${
                  activeTab === DEMO_TAB_ID
                    ? 'text-accent border-accent/70 bg-accent/15 shadow-[0_0_24px_rgba(102,255,102,0.35)]'
                    : 'text-accent/90 border-accent/30 bg-accent/10 hover:bg-accent/15 hover:border-accent/60 shadow-[0_0_18px_rgba(102,255,102,0.18)]'
                }`}
              >
                <span className="relative inline-flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-70" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                DEMO
              </button>
              <button
                onClick={() => { setActiveTab(SETTINGS_TAB_ID); setIsAdding(false); setSearchTerm(''); }}
                className={`text-[10px] sm:text-[11px] tracking-[0.3em] uppercase transition-all pb-6 -mb-6 border-b-2 font-bold whitespace-nowrap ${
                  activeTab === SETTINGS_TAB_ID ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-primary'
                }`}
              >
                SETTINGS
              </button>
              <button onClick={() => setShowInfo(true)} title="Info & Help" className="text-muted/40 hover:text-cyan-400 transition-colors">
                <Info size={18} strokeWidth={1.5} />
              </button>
              <button onClick={handleLogout} title="Terminate Session" className="text-muted/40 hover:text-red-400 transition-colors">
                <LogOut size={18} strokeWidth={1.5} />
              </button>
            </div>
          </nav>

          <div className="min-h-[60vh] space-y-12">
            <div className="glass rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-[11px] tracking-[0.2em] uppercase text-primary font-bold">Welcome, {signedInName}</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-accent/70 font-bold">{signedInRole}</div>
            </div>

            <div className="text-[10px] tracking-[0.3em] uppercase text-muted font-bold">{sectionTitle}</div>

            {activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID && (
              <div className="flex justify-end">
                <SearchInput value={searchTerm} onChange={setSearchTerm} />
              </div>
            )}

            {isOwnerSession && activeTab === 'JONO' && (
              <div className="border border-edge rounded-2xl p-6 space-y-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted/50 font-bold">JONO default note (pinned to top of every user tab)</p>
                <textarea
                  value={defaultNote}
                  onChange={(event) => setDefaultNote(event.target.value)}
                  placeholder="This note will appear as a pinned card on every user tab..."
                  className="w-full bg-transparent text-sm text-primary border border-edge rounded-xl p-4 min-h-[90px] resize-none focus:outline-none"
                />
                <p className="text-[9px] tracking-[0.15em] uppercase text-accent/70 font-bold">Appears as a read-only pinned note at the top of every user tab.</p>
                <div className="flex justify-end">
                  <button onClick={saveDefaultNote} className="px-6 py-2 rounded-xl bg-accent text-contrast text-[10px] tracking-[0.2em] uppercase font-bold">
                    Save Default Note
                  </button>
                </div>
              </div>
            )}

            {isOwnerSession && activeTab === 'JONO' && (
              <div className="border border-edge rounded-2xl p-6 space-y-6">
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
            ) : (
              <>
                {activeTab !== 'JONO' && defaultNote.trim() && (
                  <div className="space-y-10">
                    <div className="flex items-center gap-6">
                      <h4 className="text-[11px] tracking-[0.4em] text-accent/60 uppercase font-bold">JONO Standard Note</h4>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-accent/10 to-transparent" />
                    </div>
                    <div className="border border-accent/20 rounded-[2rem] p-8 bg-accent/[0.03] relative">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-accent/60" />
                        <span className="text-[9px] tracking-[0.3em] uppercase text-accent/50 font-bold">Pinned by JONO — Read Only</span>
                      </div>
                      <p className="text-sm text-primary/80 whitespace-pre-wrap leading-relaxed">{defaultNote}</p>
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

          <footer className="mt-16 pb-8 text-center">
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted/30 font-bold">&copy; 2026 JB³Ai. All Rights Reserved.</p>
          </footer>
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
