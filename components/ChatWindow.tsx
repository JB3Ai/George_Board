import React, { useState, useRef, useEffect } from 'react';
import { ClipboardItem } from '../types';
import { Send } from 'lucide-react';

interface ChatWindowProps {
  messages: ClipboardItem[];
  currentUser: string;
  onSend: (content: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, currentUser, onSend }) => {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {sorted.length === 0 && (
          <div className="chat-empty">
            <p className="text-[11px] tracking-[0.2em] uppercase text-muted/40 text-center py-12">No messages yet — start the conversation</p>
          </div>
        )}
        {sorted.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.userId === currentUser ? 'chat-mine' : 'chat-theirs'}`}
          >
            <div className="chat-bubble-meta">
              {msg.userId === currentUser ? 'YOU' : msg.userId.split('@')[0].toUpperCase()}
              <span className="chat-time">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="chat-bubble-text">{msg.content}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a secure message..."
          className="chat-input"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="chat-send-btn"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
