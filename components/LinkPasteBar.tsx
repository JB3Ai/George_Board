
import React, { useState, useEffect } from 'react';
import { Link, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

interface LinkPasteBarProps {
  onAdd: (url: string) => Promise<void>;
  disabled?: boolean;
}

export const LinkPasteBar: React.FC<LinkPasteBarProps> = ({ onAdd, disabled }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    try {
      const parsed = new URL(url);
      setIsValid(parsed.protocol === 'http:' || parsed.protocol === 'https:');
    } catch {
      setIsValid(false);
    }
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    
    setLoading(true);
    try {
      await onAdd(url);
      setUrl('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full relative group">
      <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-all duration-500 ${isValid ? 'text-accent scale-125' : 'text-muted/20'}`}>
        {isValid ? <ShieldCheck size={20} className="text-accent" /> : <Link size={20} />}
      </div>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={disabled || loading}
        placeholder="Secure asset URL initialization..."
        className={`w-full h-16 bg-card/10 border rounded-2xl pl-16 pr-16 text-base font-light text-primary placeholder:text-muted/30 focus:outline-none transition-all duration-700 ${
          isValid 
          ? 'border-accent/30 bg-accent/5 shadow-[0_0_40px_rgba(102,255,102,0.03)]' 
          : 'border-edge focus:border-accent/10'
        }`}
      />
      {url && (
        <button
          type="submit"
          disabled={loading || !isValid}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all duration-500 ${
            isValid 
            ? 'bg-accent text-contrast hover:bg-accent shadow-lg' 
            : 'bg-card/10 text-muted/20 cursor-not-allowed'
          }`}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
        </button>
      )}
    </form>
  );
};
