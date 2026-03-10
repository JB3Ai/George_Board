
import React, { useRef, useState, useEffect } from 'react';
import { ExternalLink, Copy, Archive, Pin, CheckCircle2, Clock, Trash2, Globe, Loader2, Youtube, MapPin, Calendar, FileText, CheckSquare, Eye, Edit3, RefreshCw, Link2, FileArchive, Download, Image as ImageIcon, Video as VideoIcon, Share2 } from 'lucide-react';
import { ClipboardItem, ItemType, TaskStatus, UserEmail, EnrichmentStatus } from '../types';
import { useToast } from './Toast';
import { formatFileSize, getFileIcon } from '../services/documentService';

interface CardProps {
  item: ClipboardItem;
  currentUser: UserEmail;
  canManageAll?: boolean;
  onUpdate: (id: string, updates: Partial<ClipboardItem>) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ClipboardItem) => void;
  onRefresh: (id: string) => void;
  onShare?: (item: ClipboardItem) => void;
  viewMode?: 'grid-big' | 'grid-small' | 'list';
  onResetVisibility?: (id: string) => void;
}

export const Card: React.FC<CardProps> = ({ item, currentUser, canManageAll = false, onUpdate, onDelete, onEdit, onRefresh, onShare, viewMode = 'grid-big', onResetVisibility }) => {
  const isOwner = canManageAll || item.userId === currentUser;
  const isEnriching = item.enrichmentStatus === EnrichmentStatus.PENDING;
  const isDelayed = item.enrichmentStatus === EnrichmentStatus.DELAYED;
  const hasFailed = item.enrichmentStatus === EnrichmentStatus.FAILED || isDelayed;
  const cardRef = useRef<HTMLDivElement>(null);
  const [showCooldown, setShowCooldown] = useState(false);
  const { showToast } = useToast();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mouse-x', `${e.clientX - left}px`);
    cardRef.current.style.setProperty('--mouse-y', `${e.clientY - top}px`);
  };

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (item.preview_next_allowed_at && now < item.preview_next_allowed_at) {
      setShowCooldown(true);
      setTimeout(() => setShowCooldown(false), 2000);
      return;
    }
    onRefresh(item.id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(item.content);
    showToast('Content copied to clipboard', 'success');
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.content);
    showToast('Link copied to clipboard', 'success');
  };

  const nextStatus = (current: TaskStatus) => {
    if (current === TaskStatus.OPEN) return TaskStatus.WAITING;
    if (current === TaskStatus.WAITING) return TaskStatus.DONE;
    return TaskStatus.OPEN;
  };

  const getTypeIcon = () => {
    switch(item.type) {
      case ItemType.WEBPAGE: return <Globe size={12} />;
      case ItemType.YOUTUBE: return <Youtube size={12} className="text-red-500" />;
      case ItemType.EVENT: return <Calendar size={12} />;
      case ItemType.TASK: return <CheckSquare size={12} />;
      case ItemType.NOTE: return <FileText size={12} />;
      case ItemType.DOCUMENT: return <FileArchive size={12} className="text-blue-400" />;
      case ItemType.IMAGE: return <ImageIcon size={12} className="text-purple-400" />;
      case ItemType.VIDEO: return <VideoIcon size={12} className="text-pink-400" />;
      default: return null;
    }
  };

  const handleAddToCalendar = () => {
    if (item.type !== ItemType.EVENT || !item.dueDate) return;
    
    // Create ICS file content
    const startDate = new Date(item.dueDate);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//JB3Ai//Clipboard//EN",
      "BEGIN:VEVENT",
      `UID:${item.id}@jb3ai.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${item.title}`,
      `DESCRIPTION:${item.content.replace(/\n/g, "\\n")}`,
      `LOCATION:${(item.eventLocation || "").replace(/\n/g, "\\n")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${item.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getSafeHostname = (content: string) => {
    try {
      return new URL(content).hostname;
    } catch (e) {
      return content.split('/')[0] || 'Unknown Origin';
    }
  };

  const seenByOther = (item.readBy || []).some(reader => reader !== currentUser);
  const lastReader = (item.readBy || []).find(reader => reader !== currentUser);
  const readerName = lastReader ? lastReader.split('@')[0].toUpperCase() : 'USER';

  const showRefresh = hasFailed || (item.preview_last_fetched_at && Date.now() - item.preview_last_fetched_at > 24 * 60 * 60 * 1000);

  const getAssetUrl = () => {
    if (item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) {
      return item.content;
    }
    return item.fileUrl || null;
  };

  const openAsset = () => {
    const assetUrl = getAssetUrl();
    if (!assetUrl) return;
    window.open(assetUrl, '_blank');
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Allow buttons/links/inputs inside the card to keep their own behavior.
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, label, [role="button"]')) {
      return;
    }
    openAsset();
  };

  // ─── LIST VIEW: compact single-line row ───
  if (viewMode === 'list') {
    const openItem = () => openAsset();
    const displayTitle = item.metadata?.title || item.title || 'Untitled';
    return (
      <div
        className={`flex items-center gap-4 px-5 py-3 glass rounded-xl group/row hover:border-accent/20 transition-all ${getAssetUrl() ? 'cursor-pointer' : ''}`}
        onClick={handleCardClick}
      >
        <span className="text-muted/50 shrink-0">{getTypeIcon()}</span>
        <span className="flex-1 min-w-0 text-sm text-primary truncate font-medium">{displayTitle}</span>
        {item.isPinned && <Pin size={10} className="text-accent fill-accent shrink-0" />}
        {seenByOther && <Eye size={10} className="text-accent shrink-0" />}
        <div className="flex items-center gap-1.5 shrink-0 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
          {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE || item.fileUrl) && (
            <button onClick={openItem} className="p-1.5 rounded-lg bg-card/10 hover:bg-accent/10 text-muted hover:text-accent border border-edge transition-all" title="Open">
              <ExternalLink size={12} />
            </button>
          )}
          {isOwner && onShare && (
            <button onClick={() => onShare(item)} className="p-1.5 rounded-lg bg-card/10 hover:bg-accent/10 text-muted hover:text-accent border border-edge transition-all" title="Share">
              <Share2 size={12} />
            </button>
          )}
          {isOwner && (
            <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg bg-card/10 hover:bg-accent/10 text-muted hover:text-accent border border-edge transition-all" title="Edit">
              <Edit3 size={12} />
            </button>
          )}
          {isOwner && (
            <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg bg-card/10 hover:bg-red-500/10 text-muted hover:text-red-400 border border-edge transition-all" title="Delete">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={handleCardClick}
      className={`glass rounded-[2rem] flex flex-col overflow-hidden group relative glow-card ${item.isArchived ? 'opacity-30 grayscale-[0.5]' : ''} ${getAssetUrl() ? 'cursor-pointer' : ''}`}
    >
      {/* IMAGE banner — shows full image at top of card */}
      {item.type === ItemType.IMAGE && item.fileUrl && (
        <div className="w-full overflow-hidden bg-black/20 border-b border-edge relative shrink-0 cursor-pointer group/img"
          onClick={() => window.open(item.fileUrl, '_blank')}>
          <img
            src={item.fileUrl}
            alt={item.fileName || item.title}
            loading="lazy"
            className="w-full max-h-[280px] object-cover transition-transform duration-700 group-hover/img:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80 pointer-events-none" />
          <div className="absolute top-3 right-3 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-edge text-[9px] tracking-[0.2em] text-primary/60 uppercase font-bold backdrop-blur-sm">
              View Full
            </div>
          </div>
          {item.fileName && (
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
              <span className="text-[10px] tracking-widest text-primary/50 uppercase font-bold truncate">{item.fileName}</span>
              {item.fileSize && (
                <span className="text-[9px] tracking-widest text-primary/30 uppercase font-bold shrink-0 ml-2">{formatFileSize(item.fileSize)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Banner for Link Types (WEBPAGE/YOUTUBE) */}
      {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) && (
        <div className="w-full h-[160px] md:h-[120px] sm:h-[96px] overflow-hidden bg-card/10 border-b border-edge relative shrink-0">
          {item.metadata?.og_image_url ? (
            <img 
              src={item.metadata.og_image_url} 
              alt="" 
              loading="lazy"
              className="w-full h-full object-cover grayscale opacity-30 transition-all duration-1000 ease-out group-hover:opacity-60 group-hover:grayscale-0"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isEnriching ? 'animate-skeleton' : isDelayed ? 'animate-pulse opacity-40' : ''}`}>
               {item.type === ItemType.YOUTUBE ? <Youtube size={32} className="text-primary/5" /> : <Globe size={32} className="text-primary/5" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-transparent opacity-80" />
          {item.type === ItemType.YOUTUBE && item.metadata?.og_image_url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
               <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center backdrop-blur-sm">
                 <Youtube size={24} className="text-red-500 fill-red-500/20" />
               </div>
            </div>
          )}
        </div>
      )}

      <div className="p-10 flex flex-col gap-8 relative z-10">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex items-center gap-4">
              <span className={`text-[11px] tracking-[0.3em] text-muted uppercase font-bold flex items-center gap-2 ${isEnriching ? 'animate-skeleton' : ''}`}>
                {getTypeIcon()}
                {item.metadata?.siteName || (isEnriching ? 'Analysing...' : isDelayed ? 'Preview delayed' : item.type)}
              </span>
              {item.isPinned && <Pin size={12} className="text-accent fill-accent group-hover:animate-pin-glow" />}
            </div>
            
            <h3 className={`text-xl font-medium text-primary leading-snug tracking-tight break-words whitespace-normal [overflow-wrap:anywhere] ${isEnriching ? 'animate-skeleton text-primary/10' : ''}`}>
              {item.metadata?.title || item.title || "Untitled"}
            </h3>
            {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) && (
              <p className="text-sm text-muted leading-relaxed font-normal line-clamp-2">
                {item.metadata?.description && item.metadata.description.length < item.content.length 
                  ? item.metadata.description 
                  : getSafeHostname(item.content)}
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 sm:opacity-0 sm:pointer-events-none sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 transition-all duration-500 sm:translate-x-2 sm:group-hover:translate-x-0">
            {showRefresh && (
              <div className="relative">
                <button 
                  onClick={handleRefreshClick} 
                  className={`p-2.5 sm:p-3 bg-card/10 hover:bg-accent/10 rounded-2xl text-muted hover:text-accent border border-edge transition-all ${isEnriching ? 'animate-spin' : ''}`} 
                  title="Refresh preview"
                >
                  <RefreshCw size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
                {showCooldown && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/80 text-[9px] text-primary/60 tracking-widest uppercase rounded-lg border border-edge whitespace-nowrap animate-in fade-in slide-in-from-bottom-1">
                    Try again soon
                  </div>
                )}
              </div>
            )}
            {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) && (
              <>
                <button onClick={() => window.open(item.content, '_blank')} className="p-2.5 sm:p-3 bg-card/10 hover:bg-accent/10 rounded-2xl text-muted hover:text-accent border border-edge transition-all" title="Open link">
                  <ExternalLink size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
                <button onClick={handleCopyLink} className="p-2.5 sm:p-3 bg-card/10 hover:bg-accent/10 rounded-2xl text-muted hover:text-accent border border-edge transition-all" title="Copy Link">
                  <Link2 size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
              </>
            )}
            <button onClick={handleCopy} title="Copy Content" className="p-2.5 sm:p-3 bg-card/10 hover:bg-accent/10 rounded-2xl text-muted hover:text-accent border border-edge transition-all">
              <Copy size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
            </button>
            
            {isOwner && (
              <>
                {onShare && (
                  <button onClick={() => onShare(item)} className="p-2.5 sm:p-3 bg-card/10 hover:bg-accent/10 rounded-2xl text-muted hover:text-accent border border-edge transition-all" title="Share">
                    <Share2 size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                  </button>
                )}
                <button onClick={() => onEdit(item)} className="p-2.5 sm:p-3 bg-card/10 hover:bg-accent/10 rounded-2xl text-muted hover:text-accent border border-edge transition-all" title="Edit">
                  <Edit3 size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => onUpdate(item.id, { isPinned: !item.isPinned })} className={`p-2.5 sm:p-3 bg-card/10 rounded-2xl border transition-all ${item.isPinned ? 'text-accent border-accent/20' : 'text-muted border-edge hover:text-primary hover:bg-card/20'}`} title="Pin to top">
                  <Pin size={14} className={`sm:w-4 sm:h-4 ${item.isPinned ? "animate-pin-glow" : ""}`} strokeWidth={1.5} />
                </button>
                <button onClick={() => onUpdate(item.id, { isArchived: !item.isArchived })} className={`p-2.5 sm:p-3 bg-card/10 rounded-2xl border transition-all ${item.isArchived ? 'text-accent border-accent/20' : 'text-muted border-edge hover:text-primary hover:bg-card/20'}`} title="Archive">
                  <Archive size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-2.5 sm:p-3 bg-card/10 hover:bg-red-500/10 rounded-2xl text-muted hover:text-red-400 border border-edge transition-all" title="Delete">
                  <Trash2 size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </div>

        {item.type === ItemType.TASK && (
          <div className="flex flex-col gap-8">
            <p className="text-sm text-muted leading-relaxed font-normal">{item.content}</p>
            <div className="flex items-center justify-between pt-8 border-t border-edge">
              <button
                disabled={!isOwner}
                onClick={() => onUpdate(item.id, { taskStatus: nextStatus(item.taskStatus!) })}
                className={`flex items-center gap-3 px-6 py-2.5 rounded-full border text-[11px] tracking-[0.2em] uppercase transition-all font-bold ${
                  item.taskStatus === TaskStatus.DONE 
                  ? 'bg-accent/5 border-accent/20 text-accent' 
                  : item.taskStatus === TaskStatus.WAITING
                  ? 'bg-yellow-400/5 border-yellow-400/10 text-yellow-400/70'
                  : 'bg-card/10 border-edge text-muted'
                }`}
              >
                {item.taskStatus === TaskStatus.DONE ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {item.taskStatus}
              </button>
              {item.dueDate && (
                <span className="text-[11px] text-muted tracking-[0.2em] uppercase font-bold opacity-60">Expires: {new Date(item.dueDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        )}

        {item.type === ItemType.EVENT && (
          <div className="flex flex-col gap-6">
             <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 bg-card/10 px-4 py-3 rounded-xl border border-edge">
                  <Clock size={14} className="text-accent" />
                  <span className="text-xs text-primary font-mono">
                    {item.dueDate ? new Date(item.dueDate).toLocaleString() : 'TBD'}
                  </span>
                </div>
                {item.eventLocation && (
                  <div className="flex items-center gap-3 bg-card/10 px-4 py-3 rounded-xl border border-edge">
                    <MapPin size={14} className="text-accent" />
                    <span className="text-xs text-primary font-mono">{item.eventLocation}</span>
                  </div>
                )}
             </div>
             {item.content && (
               <p className="text-sm text-muted leading-relaxed font-normal italic">"{item.content}"</p>
             )}
             {item.dueDate && (
                <button 
                  onClick={handleAddToCalendar}
                  className="flex items-center justify-center gap-3 py-3 w-full rounded-2xl bg-accent/10 border border-accent/40 text-accent text-[11px] tracking-[0.2em] font-bold uppercase hover:bg-accent/20 hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(102,255,102,0.1)]"
                >
                  <Calendar size={14} />
                  Add to My Calendar
                </button>
             )}
          </div>
        )}

        {item.type === ItemType.NOTE && (
          <p className="text-sm text-muted leading-relaxed font-normal whitespace-pre-wrap">
            {item.content}
          </p>
        )}

        {item.type === ItemType.DOCUMENT && (
          <div className="flex flex-col gap-6">
            {/* File info row */}
            {item.fileName && (
              <div className="flex items-center gap-5 bg-card/10 p-5 rounded-2xl border border-edge transition-all">
                <div className="w-12 h-12 rounded-xl bg-card/10 flex items-center justify-center shrink-0 border border-edge text-xl">
                  {getFileIcon(item.fileName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary font-medium truncate">{item.fileName}</p>
                  {item.fileSize && (
                    <p className="text-[11px] text-muted mt-1 tracking-widest uppercase">{formatFileSize(item.fileSize)}</p>
                  )}
                </div>
              </div>
            )}
            {/* Notes */}
            {item.content && (
              <p className="text-sm text-muted leading-relaxed font-normal whitespace-pre-wrap">{item.content}</p>
            )}
            {/* Action buttons */}
            {item.fileUrl && (
              <div className="flex gap-3">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 py-3 flex-1 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] tracking-[0.2em] font-bold uppercase hover:bg-blue-500/20 transition-all"
                >
                  <ExternalLink size={14} />
                  View
                </a>
                <a
                  href={item.fileUrl}
                  download={item.fileName}
                  className="flex items-center justify-center gap-3 py-3 flex-1 rounded-2xl bg-card/10 border border-edge text-muted text-[11px] tracking-[0.2em] font-bold uppercase hover:bg-card/20 transition-all"
                >
                  <Download size={14} />
                  Download
                </a>
              </div>
            )}
            {!item.fileUrl && (
              <span className="text-[9px] tracking-[0.3em] text-red-400/40 uppercase font-bold">File unavailable</span>
            )}
          </div>
        )}

        {item.type === ItemType.IMAGE && (
          <div className="flex flex-col gap-6">
            {/* Caption / notes */}
            {item.content && (
              <p className="text-sm text-muted leading-relaxed font-normal whitespace-pre-wrap italic">{item.content}</p>
            )}
            {item.fileUrl && (
              <div className="flex gap-3">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 py-3 flex-1 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] tracking-[0.2em] font-bold uppercase hover:bg-purple-500/20 transition-all"
                >
                  <ExternalLink size={14} />
                  View Full
                </a>
                <a
                  href={item.fileUrl}
                  download={item.fileName}
                  className="flex items-center justify-center gap-3 py-3 flex-1 rounded-2xl bg-card/10 border border-edge text-muted text-[11px] tracking-[0.2em] font-bold uppercase hover:bg-card/20 transition-all"
                >
                  <Download size={14} />
                  Download
                </a>
              </div>
            )}
            {!item.fileUrl && (
              <span className="text-[9px] tracking-[0.3em] text-red-400/40 uppercase font-bold">Image unavailable</span>
            )}
          </div>
        )}

        {item.type === ItemType.VIDEO && (
          <div className="flex flex-col gap-6">
            {/* HTML5 video player */}
            {item.fileUrl ? (
              <div className="overflow-hidden rounded-2xl bg-black border border-edge">
                <video
                  src={item.fileUrl}
                  controls
                  preload="metadata"
                  className="w-full rounded-2xl"
                  style={{ maxHeight: '320px', background: '#000' }}
                />
              </div>
            ) : (
              <span className="text-[9px] tracking-[0.3em] text-red-400/40 uppercase font-bold">Video unavailable</span>
            )}
            {/* File info + download */}
            {item.fileName && (
              <div className="flex items-center gap-5 bg-card/10 p-4 rounded-2xl border border-edge">
                <div className="w-10 h-10 rounded-xl bg-card/10 flex items-center justify-center shrink-0 border border-edge text-lg">🎬</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary font-medium truncate">{item.fileName}</p>
                  {item.fileSize && (
                    <p className="text-[11px] text-muted mt-1 tracking-widest uppercase">{formatFileSize(item.fileSize)}</p>
                  )}
                </div>
                {item.fileUrl && (
                  <a href={item.fileUrl} download={item.fileName}
                    className="p-2.5 rounded-xl bg-card/10 hover:bg-card/20 text-muted hover:text-primary transition-all border border-edge"
                    title="Download">
                    <Download size={14} />
                  </a>
                )}
              </div>
            )}
            {item.content && (
              <p className="text-sm text-muted leading-relaxed font-normal whitespace-pre-wrap">{item.content}</p>
            )}
          </div>
        )}

        {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-5 bg-card/10 p-5 rounded-2xl border border-edge transition-all flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-card/10 flex items-center justify-center shrink-0 overflow-hidden relative border border-edge">
                  {isEnriching ? (
                    <Loader2 size={16} className="text-accent animate-spin" />
                  ) : item.metadata?.favicon ? (
                    <img src={item.metadata.favicon} alt="" className="w-6 h-6 grayscale opacity-40 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700" />
                  ) : item.type === ItemType.YOUTUBE ? (
                    <Youtube size={16} className="text-red-500/50" />
                  ) : (
                    <Globe size={16} className="text-primary/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted truncate font-mono tracking-tight lowercase">
                    {getSafeHostname(item.content)}
                  </p>
                </div>
              </div>
              
              {hasFailed && (
                <span className="text-[9px] tracking-[0.3em] text-red-400/40 uppercase font-bold shrink-0">No preview available</span>
              )}
            </div>
          </div>
        )}

        {/* Read Receipt Logic: Only show to owner if other stakeholder has seen it */}
        {isOwner && seenByOther && (
          <div className="mt-2 pt-6 border-t border-edge flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30 shadow-[0_0_12px_rgba(102,255,102,0.2)]">
                   <Eye size={10} className="text-accent" />
                </div>
                <span className="text-[10px] tracking-[0.2em] text-accent uppercase font-bold italic drop-shadow-[0_0_8px_rgba(102,255,102,0.3)]">
                   Confirmed Visibility
                </span>
             </div>
             <div className="flex items-center gap-3">
               {onResetVisibility && (
                 <button
                   className="reset-visibility-btn"
                   onClick={(e) => { e.stopPropagation(); onResetVisibility(item.id); }}
                 >
                   RESET VISIBILITY
                 </button>
               )}
               <div className="flex flex-col items-end">
                  <span className="text-[9px] tracking-widest text-muted uppercase font-bold opacity-40">Stakeholder: {readerName}</span>
                  <span className="text-[8px] tracking-premium text-muted uppercase opacity-20">Protocol JB³-Read</span>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
