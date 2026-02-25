
import React, { useState, useEffect, useMemo } from 'react';
import { SessionGuard } from './components/SessionGuard';
import { PinboardLane } from './components/PinboardLane';
import { LinkPasteBar } from './components/LinkPasteBar';
import { SearchInput } from './components/SearchInput';
import { InfoTab } from './components/InfoTab';
import { SettingsTab } from './components/SettingsTab';
import { ToastProvider } from './components/Toast';
import { db } from './services/db';
import { fetchLinkMetadata } from './services/metadata';
import { ClipboardItem, UserEmail, ItemType, TaskStatus, EnrichmentStatus } from './types';
import { TABS } from './constants';
import { LogOut, Plus, Calendar, MapPin, Youtube, Globe, FileText, CheckSquare, Rocket } from 'lucide-react';

const App: React.FC = () => {
  // Fix: Explicitly type activeTab as string to prevent narrowing that causes comparison errors
  const [activeTab, setActiveTab] = useState<string>('JONO');
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ClipboardItem | null>(null);
  
  const [newItemType, setNewItemType] = useState<ItemType>(ItemType.NOTE);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');

  useEffect(() => {
    setItems(db.getItems());
  }, []);

  const getCurrentSession = (): { email: UserEmail } => {
    const saved = localStorage.getItem('jb3_session');
    return saved ? JSON.parse(saved) : { email: 'jono@jonoblackburn.com' };
  };

  const session = getCurrentSession();

  // Automatic Read Receipt Logic: Triggers when viewing someone else's space
  useEffect(() => {
    const currentTabInfo = TABS.find(t => t.id === activeTab);
    // Logic: If I am Jono and I am looking at George's tab...
    if (currentTabInfo && currentTabInfo.email && currentTabInfo.email !== session.email) {
      const otherUserItems = items.filter(i => 
        i.userId === currentTabInfo.email && 
        !(i.readBy || []).includes(session.email)
      );
      
      if (otherUserItems.length > 0) {
        otherUserItems.forEach(item => {
          db.markAsRead(item.id, session.email);
        });
        // Refresh items to reflect read status locally
        setItems(db.getItems());
      }
    }
  }, [activeTab, items.length, session.email]); // items.length used to avoid loop while capturing new arrivals

  const handleLogout = () => {
    localStorage.removeItem('jb3_session');
    window.location.reload();
  };

  const handleEdit = (item: ClipboardItem) => {
    setEditingItem(item);
    setNewItemType(item.type);
    
    // For links, title input holds URL, content holds the note
    if (item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) {
      setNewItemTitle(item.content); // URL
      setNewItemContent(item.metadata?.description || ''); // User Note
    } else {
      setNewItemTitle(item.title);
      setNewItemContent(item.content);
    }
    
    setNewItemDueDate(item.dueDate || '');
    setNewItemLocation(item.eventLocation || '');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddLink = async (url: string, explicitType?: ItemType, manualNote?: string) => {
    let hostname = 'LINK';
    try {
      hostname = new URL(url).hostname;
    } catch (e) {
      hostname = url.split('/')[2] || 'LINK';
    }

    const finalType = explicitType || (url.includes('youtube.com') || url.includes('youtu.be') ? ItemType.YOUTUBE : ItemType.WEBPAGE);

    const item = db.addItem({ 
      userId: session.email, 
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
      
      // Merge metadata with existing manualNote if it exists
      const finalMetadata = hasMetadata 
        ? { ...metadata, description: manualNote || metadata.description }
        : (manualNote ? { description: manualNote } : {});

      db.updateItem(item.id, session.email, { 
        metadata: finalMetadata,
        enrichmentStatus: hasMetadata ? EnrichmentStatus.SUCCESS : EnrichmentStatus.FAILED 
      });
    } catch (error) {
      db.updateItem(item.id, session.email, { 
        enrichmentStatus: EnrichmentStatus.FAILED 
      });
    } finally {
      setItems(db.getItems());
    }
  };

  const filteredItems = useMemo(() => {
    const currentTabInfo = TABS.find(t => t.id === activeTab);
    
    let baseItems = items;
    // Fix: Using a direct check that avoids TS narrowing issues if they persist
    const isStorage = activeTab === 'STORAGE';
    if (isStorage) {
      baseItems = items.filter(i => i.type === ItemType.WEBPAGE || i.type === ItemType.YOUTUBE);
    } else if (currentTabInfo && currentTabInfo.email) {
      baseItems = items.filter(i => i.userId === currentTabInfo.email);
    } else {
      return [];
    }
    
    return baseItems.filter(i => {
      const matchesSearch = 
        i.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.metadata?.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.metadata?.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      return !i.isArchived && matchesSearch;
    });
  }, [items, activeTab, searchTerm]);

  const isOwnTab = activeTab === (session.email.includes('jono') ? 'JONO' : 'GEORGE');

  const getIconForType = (type: ItemType) => {
    switch(type) {
      case ItemType.NOTE: return <FileText size={14} />;
      case ItemType.TASK: return <CheckSquare size={14} />;
      case ItemType.EVENT: return <Calendar size={14} />;
      case ItemType.WEBPAGE: return <Globe size={14} />;
      case ItemType.YOUTUBE: return <Youtube size={14} />;
      default: return <Plus size={14} />;
    }
  };

  const handleDemoClick = () => {
    // Navigate to dedicated development webapp
    window.open('https://jb3ai.com/nexus-proto', '_blank');
  };

  const handleCommit = async () => {
    if (editingItem) {
      const updates: Partial<ClipboardItem> = {
        type: newItemType,
        taskStatus: newItemType === ItemType.TASK ? (editingItem.taskStatus || TaskStatus.OPEN) : undefined,
        dueDate: newItemType === ItemType.TASK || newItemType === ItemType.EVENT ? newItemDueDate : undefined,
        eventLocation: newItemType === ItemType.EVENT ? newItemLocation : undefined,
      };

      if (newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE) {
        updates.content = newItemTitle; // URL
        updates.metadata = { ...editingItem.metadata, description: newItemContent }; // User Note
      } else {
        updates.title = newItemTitle || "Untitled Log";
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
          type: newItemType,
          title: newItemTitle || "Untitled Log",
          content: newItemContent,
          taskStatus: newItemType === ItemType.TASK ? TaskStatus.OPEN : undefined,
          dueDate: newItemType === ItemType.TASK || newItemType === ItemType.EVENT ? newItemDueDate : undefined,
          eventLocation: newItemType === ItemType.EVENT ? newItemLocation : undefined,
        });
      }
    }
    setItems(db.getItems());
    setIsAdding(false);
    setNewItemTitle(''); setNewItemContent(''); setNewItemDueDate(''); setNewItemLocation('');
  };

  return (
    <ToastProvider>
      <SessionGuard>
        <div className="flex flex-col gap-16">
          <nav className="flex items-center justify-between border-b border-white/[0.04] pb-6 overflow-x-auto">
          <div className="flex gap-12 min-w-max items-center">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsAdding(false); setSearchTerm(''); }}
                className={`text-[11px] tracking-[0.3em] uppercase transition-all pb-6 -mb-6 border-b-2 font-bold whitespace-nowrap ${
                  activeTab === tab.id ? 'text-[#66FF66] border-[#66FF66]' : 'text-[#9AA3AD]/40 border-transparent hover:text-[#9AA3AD]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-6 ml-8">
            <button 
              onClick={handleDemoClick}
              className="flex items-center gap-3 px-6 py-3 bg-[#66FF66]/10 border border-[#66FF66]/30 rounded-xl text-[#66FF66] text-[10px] tracking-[0.2em] font-bold uppercase hover:bg-[#66FF66]/20 hover:scale-[1.05] transition-all group shadow-[0_0_20px_rgba(102,255,102,0.1)]"
            >
              <Rocket size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              DEMO
            </button>
            <button onClick={handleLogout} title="Terminate Session" className="text-[#9AA3AD]/20 hover:text-red-400 transition-colors">
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          </div>
        </nav>

        <div className="min-h-[60vh]">
          {(activeTab === 'JONO' || activeTab === 'GEORGE' || activeTab === 'STORAGE') && (
            <div className="space-y-16">
              <div className="flex flex-col lg:flex-row gap-8 items-end justify-between">
                <div className="flex-1 w-full max-w-2xl">
                  {isOwnTab && activeTab !== 'STORAGE' ? (
                    <LinkPasteBar onAdd={handleAddLink} />
                  ) : (
                    <div className="h-16 flex items-center px-8 glass rounded-2xl text-[11px] tracking-[0.3em] text-[#9AA3AD]/30 uppercase font-bold border-dashed border-white/5">
                      {activeTab === 'STORAGE' ? 'Central Asset Repository' : 'System viewing shared logs'}
                    </div>
                  )}
                </div>
                <SearchInput value={searchTerm} onChange={setSearchTerm} />
              </div>

              {isOwnTab && !isAdding && (
                <button onClick={() => { setEditingItem(null); setIsAdding(true); }} className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] text-[#66FF66]/60 hover:text-[#66FF66] transition-all uppercase font-bold group">
                  <div className="w-8 h-8 rounded-full bg-[#66FF66]/5 flex items-center justify-center border border-[#66FF66]/10 group-hover:bg-[#66FF66]/10 transition-colors">
                    <Plus size={16} />
                  </div>
                  Secure Entry
                </button>
              )}

              {isAdding && (
                <div className="glass p-12 rounded-[2.5rem] space-y-10 animate-in slide-in-from-top-4 duration-700 shadow-2xl border-t-2 border-[#66FF66]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-4">
                      {Object.values(ItemType).map(t => (
                        <button 
                          key={t} 
                          onClick={() => setNewItemType(t)} 
                          className={`text-[10px] tracking-widest px-6 py-3 rounded-full border transition-all uppercase font-bold flex items-center gap-3 ${
                            newItemType === t 
                            ? 'bg-[#66FF66] text-black border-[#66FF66]' 
                            : 'text-[#9AA3AD] border-white/10 hover:border-white/20'
                          }`}
                        >
                          {getIconForType(t)}
                          {t}
                        </button>
                      ))}
                    </div>
                    {editingItem && (
                      <span className="text-[10px] tracking-widest text-[#66FF66] uppercase font-bold">Editing Mode</span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-[9px] tracking-widest text-[#9AA3AD]/40 uppercase font-bold">
                      {newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE ? "Target URL" : "Subject Line"}
                    </p>
                    <input 
                      autoFocus 
                      placeholder={newItemType === ItemType.WEBPAGE || newItemType === ItemType.YOUTUBE ? "https://..." : "Entry Subject"} 
                      value={newItemTitle} 
                      onChange={e => setNewItemTitle(e.target.value)} 
                      className="w-full bg-transparent border-b border-white/5 py-5 text-2xl font-light text-[#E6E6E6] focus:outline-none focus:border-[#66FF66]/30 transition-all" 
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-[9px] tracking-widest text-[#9AA3AD]/40 uppercase font-bold">Observation Context</p>
                    <textarea 
                      placeholder={newItemType === ItemType.YOUTUBE || newItemType === ItemType.WEBPAGE ? "Add a description or notes about this link..." : "Detailed observation logs..."}
                      value={newItemContent} 
                      onChange={e => setNewItemContent(e.target.value)} 
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
                          onChange={e => setNewItemDueDate(e.target.value)} 
                          className="bg-white/5 px-4 py-2 rounded-lg border border-white/5 text-xs tracking-widest uppercase focus:outline-none text-[#9AA3AD] hover:border-white/20 transition-all" 
                        />
                      </div>
                    )}
                    {newItemType === ItemType.EVENT && (
                      <div className="flex items-center gap-4 text-[#9AA3AD]/40 flex-1">
                        <MapPin size={18} />
                        <input 
                          type="text"
                          placeholder="Location coordinates / Venue"
                          value={newItemLocation} 
                          onChange={e => setNewItemLocation(e.target.value)} 
                          className="w-full bg-white/5 px-4 py-2 rounded-lg border border-white/5 text-xs tracking-widest uppercase focus:outline-none text-[#9AA3AD] hover:border-white/20 transition-all" 
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-10 pt-10 border-t border-white/[0.04]">
                    <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="text-[11px] tracking-[0.3em] text-[#9AA3AD]/40 hover:text-white transition-colors uppercase font-bold">Discard</button>
                    <button onClick={handleCommit} className="px-14 h-14 bg-[#66FF66] text-black text-[11px] font-bold tracking-[0.3em] rounded-[1.25rem] uppercase hover:bg-[#80FF80] transition-colors shadow-[0_0_20px_rgba(102,255,102,0.2)]">
                      {editingItem ? 'Apply Updates' : 'Commit Entry'}
                    </button>
                  </div>
                </div>
              )}

              <PinboardLane 
                items={filteredItems} 
                currentUser={session.email} 
                onUpdate={(id, u) => { db.updateItem(id, session.email, u); setItems(db.getItems()); }} 
                onDelete={id => { db.deleteItem(id, session.email); setItems(db.getItems()); }}
                onEdit={handleEdit}
              />
            </div>
          )}

          {activeTab === 'INFO' && <InfoTab />}
          {activeTab === 'SETTINGS' && (
            <SettingsTab 
              session={{ ...session, pinVerified: true }} 
              onResetPin={() => { localStorage.removeItem('jb3_session'); window.location.reload(); }} 
            />
          )}
        </div>
      </div>
      </SessionGuard>
    </ToastProvider>
  );
};

export default App;
