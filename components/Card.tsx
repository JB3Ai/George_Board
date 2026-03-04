
import React, { useRef, useState, useEffect } from 'react';
import { ExternalLink, Copy, Archive, Pin, CheckCircle2, Clock, Trash2, Globe, Loader2, Youtube, MapPin, Calendar, FileText, CheckSquare, Eye, Edit3, RefreshCw, Link2, FileArchive, Download } from 'lucide-react';
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
}

export const Card: React.FC<CardProps> = ({ item, currentUser, canManageAll = false, onUpdate, onDelete, onEdit, onRefresh }) => {
  const isOwner = canManageAll || item.userId === currentUser;
  const isEnriching = item.enrichmentStatus === EnrichmentStatus.PENDING;
  const hasFailed = item.enrichmentStatus === EnrichmentStatus.FAILED || item.enrichmentStatus === EnrichmentStatus.DELAYED;
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

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`glass rounded-[2rem] flex flex-col overflow-hidden group relative glow-card ${item.isArchived ? 'opacity-30 grayscale-[0.5]' : ''}`}
    >
      {/* Banner for Link Types (WEBPAGE/YOUTUBE) */}
      {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) && (
        <div className="w-full h-[160px] md:h-[120px] sm:h-[96px] overflow-hidden bg-white/[0.02] border-b border-white/[0.04] relative shrink-0">
          {item.metadata?.og_image_url ? (
            <img 
              src={item.metadata.og_image_url} 
              alt="" 
              loading="lazy"
              className="w-full h-full object-cover grayscale opacity-30 transition-all duration-1000 ease-out group-hover:opacity-60 group-hover:grayscale-0"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isEnriching ? 'animate-skeleton' : ''}`}>
               {item.type === ItemType.YOUTUBE ? <Youtube size={32} className="text-white/5" /> : <Globe size={32} className="text-white/5" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-transparent to-transparent opacity-80" />
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
        <div className="flex justify-between items-start gap-6">
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-4">
              <span className={`text-[11px] tracking-[0.3em] text-[#9AA3AD] uppercase font-bold flex items-center gap-2 ${isEnriching ? 'animate-skeleton' : ''}`}>
                {getTypeIcon()}
                {item.metadata?.siteName || (isEnriching ? 'Analyzing...' : item.type)}
              </span>
              {item.isPinned && <Pin size={12} className="text-[#66FF66] fill-[#66FF66] group-hover:animate-pin-glow" />}
            </div>
            
            <h3 className={`text-xl font-medium text-[var(--text-primary)] leading-snug tracking-tight ${isEnriching ? 'animate-skeleton text-white/10' : ''}`}>
              {item.metadata?.title || item.title || "Observation Unit"}
            </h3>
            {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) && (
              <p className="text-sm text-[var(--text-muted)] leading-relaxed font-normal line-clamp-2">
                {item.metadata?.description && item.metadata.description.length < item.content.length 
                  ? item.metadata.description 
                  : getSafeHostname(item.content)}
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-2 opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0 shrink-0 justify-end">
            {showRefresh && (
              <div className="relative">
                <button 
                  onClick={handleRefreshClick} 
                  className={`p-2.5 sm:p-3 bg-white/[0.03] hover:bg-[#66FF66]/10 rounded-2xl text-[#9AA3AD] hover:text-[#66FF66] border border-white/[0.05] transition-all ${isEnriching ? 'animate-spin' : ''}`} 
                  title="Refresh Metadata"
                >
                  <RefreshCw size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
                {showCooldown && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/80 text-[9px] text-white/60 tracking-widest uppercase rounded-lg border border-white/10 whitespace-nowrap animate-in fade-in slide-in-from-bottom-1">
                    Try again soon
                  </div>
                )}
              </div>
            )}
            {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) && (
              <>
                <button onClick={() => window.open(item.content, '_blank')} className="p-2.5 sm:p-3 bg-white/[0.03] hover:bg-[#66FF66]/10 rounded-2xl text-[#9AA3AD] hover:text-[#66FF66] border border-white/[0.05] transition-all" title="Open Asset">
                  <ExternalLink size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
                <button onClick={handleCopyLink} className="p-2.5 sm:p-3 bg-white/[0.03] hover:bg-[#66FF66]/10 rounded-2xl text-[#9AA3AD] hover:text-[#66FF66] border border-white/[0.05] transition-all" title="Copy Link">
                  <Link2 size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
              </>
            )}
            <button onClick={handleCopy} title="Copy Content" className="p-2.5 sm:p-3 bg-white/[0.03] hover:bg-[#66FF66]/10 rounded-2xl text-[#9AA3AD] hover:text-[#66FF66] border border-white/[0.05] transition-all">
              <Copy size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
            </button>
            
            {isOwner && (
              <>
                <button onClick={() => onEdit(item)} className="p-2.5 sm:p-3 bg-white/[0.03] hover:bg-[#66FF66]/10 rounded-2xl text-[#9AA3AD] hover:text-[#66FF66] border border-white/[0.05] transition-all" title="Edit Record">
                  <Edit3 size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => onUpdate(item.id, { isPinned: !item.isPinned })} className={`p-2.5 sm:p-3 bg-white/[0.03] rounded-2xl border transition-all ${item.isPinned ? 'text-[#66FF66] border-[#66FF66]/20' : 'text-[#9AA3AD] border-white/[0.05] hover:text-white hover:bg-white/10'}`} title="Pin Priority">
                  <Pin size={14} className={`sm:w-4 sm:h-4 ${item.isPinned ? "animate-pin-glow" : ""}`} strokeWidth={1.5} />
                </button>
                <button onClick={() => onUpdate(item.id, { isArchived: !item.isArchived })} className={`p-2.5 sm:p-3 bg-white/[0.03] rounded-2xl border transition-all ${item.isArchived ? 'text-[#66FF66] border-[#66FF66]/20' : 'text-[#9AA3AD] border-white/[0.05] hover:text-white hover:bg-white/10'}`} title="Archive Unit">
                  <Archive size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-2.5 sm:p-3 bg-white/[0.03] hover:bg-red-500/10 rounded-2xl text-[#9AA3AD] hover:text-red-400 border border-white/[0.05] transition-all" title="Purge Record">
                  <Trash2 size={14} className="sm:w-4 sm:h-4" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </div>

        {item.type === ItemType.TASK && (
          <div className="flex flex-col gap-8">
            <p className="text-sm text-[var(--text-muted)] leading-relaxed font-normal">{item.content}</p>
            <div className="flex items-center justify-between pt-8 border-t border-white/[0.04]">
              <button
                disabled={!isOwner}
                onClick={() => onUpdate(item.id, { taskStatus: nextStatus(item.taskStatus!) })}
                className={`flex items-center gap-3 px-6 py-2.5 rounded-full border text-[11px] tracking-[0.2em] uppercase transition-all font-bold ${
                  item.taskStatus === TaskStatus.DONE 
                  ? 'bg-[#66FF66]/5 border-[#66FF66]/20 text-[#66FF66]' 
                  : item.taskStatus === TaskStatus.WAITING
                  ? 'bg-yellow-400/5 border-yellow-400/10 text-yellow-400/70'
                  : 'bg-white/5 border-white/10 text-[#9AA3AD]'
                }`}
              >
                {item.taskStatus === TaskStatus.DONE ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {item.taskStatus}
              </button>
              {item.dueDate && (
                <span className="text-[11px] text-[var(--text-muted)] tracking-[0.2em] uppercase font-bold opacity-60">Expires: {new Date(item.dueDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        )}

        {item.type === ItemType.EVENT && (
          <div className="flex flex-col gap-6">
             <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-3 rounded-xl border border-white/[0.05]">
                  <Clock size={14} className="text-[#66FF66]" />
                  <span className="text-xs text-[var(--text-primary)] font-mono">
                    {item.dueDate ? new Date(item.dueDate).toLocaleString() : 'TBD'}
                  </span>
                </div>
                {item.eventLocation && (
                  <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-3 rounded-xl border border-white/[0.05]">
                    <MapPin size={14} className="text-[#66FF66]" />
                    <span className="text-xs text-[#E6E6E6] font-mono">{item.eventLocation}</span>
                  </div>
                )}
             </div>
             {item.content && (
               <p className="text-sm text-[var(--text-muted)] leading-relaxed font-normal italic">"{item.content}"</p>
             )}
             {item.dueDate && (
                <button 
                  onClick={handleAddToCalendar}
                  className="flex items-center justify-center gap-3 py-3 w-full rounded-2xl bg-[#66FF66]/10 border border-[#66FF66]/40 text-[#66FF66] text-[11px] tracking-[0.2em] font-bold uppercase hover:bg-[#66FF66]/20 hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(102,255,102,0.1)]"
                >
                  <Calendar size={14} />
                  Add to My Calendar
                </button>
             )}
          </div>
        )}

        {item.type === ItemType.NOTE && (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed font-normal whitespace-pre-wrap">
            {item.content}
          </p>
        )}

        {item.type === ItemType.DOCUMENT && (
          <div className="flex flex-col gap-6">
            {/* File info row */}
            {item.fileName && (
              <div className="flex items-center gap-5 bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] transition-all">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-xl">
                  {getFileIcon(item.fileName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] font-medium truncate">{item.fileName}</p>
                  {item.fileSize && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 tracking-widest uppercase">{formatFileSize(item.fileSize)}</p>
                  )}
                </div>
              </div>
            )}
            {/* Notes */}
            {item.content && (
              <p className="text-sm text-[var(--text-muted)] leading-relaxed font-normal whitespace-pre-wrap">{item.content}</p>
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
                  className="flex items-center justify-center gap-3 py-3 flex-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[#9AA3AD] text-[11px] tracking-[0.2em] font-bold uppercase hover:bg-white/10 transition-all"
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

        {(item.type === ItemType.WEBPAGE || item.type === ItemType.YOUTUBE) && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-5 bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] transition-all flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden relative border border-white/10">
                  {isEnriching ? (
                    <Loader2 size={16} className="text-[#66FF66] animate-spin" />
                  ) : item.metadata?.favicon ? (
                    <img src={item.metadata.favicon} alt="" className="w-6 h-6 grayscale opacity-40 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700" />
                  ) : item.type === ItemType.YOUTUBE ? (
                    <Youtube size={16} className="text-red-500/50" />
                  ) : (
                    <Globe size={16} className="text-white/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] truncate font-mono tracking-tight lowercase">
                    {getSafeHostname(item.content)}
                  </p>
                </div>
              </div>
              
              {hasFailed && (
                <span className="text-[9px] tracking-[0.3em] text-red-400/40 uppercase font-bold shrink-0">Preview unavailable</span>
              )}
            </div>
          </div>
        )}

        {/* Read Receipt Logic: Only show to owner if other stakeholder has seen it */}
        {isOwner && seenByOther && (
          <div className="mt-2 pt-6 border-t border-white/[0.03] flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#66FF66]/10 flex items-center justify-center border border-[#66FF66]/30 shadow-[0_0_12px_rgba(102,255,102,0.2)]">
                   <Eye size={10} className="text-[#66FF66]" />
                </div>
                <span className="text-[10px] tracking-[0.2em] text-[#66FF66] uppercase font-bold italic drop-shadow-[0_0_8px_rgba(102,255,102,0.3)]">
                   Confirmed Visibility
                </span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[9px] tracking-widest text-[var(--text-muted)] uppercase font-bold opacity-40">Stakeholder: {readerName}</span>
                <span className="text-[8px] tracking-premium text-[var(--text-muted)] uppercase opacity-20">Protocol JB³-Read</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
