
import React, { useState } from 'react';
import { Mail, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { isAllowlisted } from '../services/auth';
import { useToast } from './Toast';

interface LoginProps {
  onLinkSent: (email: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLinkSent }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAllowlisted(email)) {
      showToast('Identity not recognized in registry', 'error');
      return;
    }

    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      onLinkSent(email);
    } catch (err) {
      showToast('Failed to dispatch magic link', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-12 animate-in fade-in duration-1000">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-8 bg-accent/5 border border-accent/10 rounded-[2.5rem] mb-6 shadow-2xl">
          <ShieldCheck size={48} strokeWidth={1} className="text-accent" />
        </div>
        <h2 className="text-lg font-light tracking-[0.4em] text-primary uppercase">Stakeholder Portal</h2>
        <p className="text-[11px] text-muted/60 tracking-wider font-bold uppercase">Authorization Layer V3</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="relative group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted/40 group-focus-within:text-accent transition-colors">
            <Mail size={20} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            placeholder="Authorized Stakeholder Email"
            autoFocus
            className="w-full h-16 bg-card/10 border border-edge rounded-2xl pl-16 pr-6 text-base text-primary focus:outline-none focus:border-accent/30 transition-all font-light"
            style={{ position: 'relative', zIndex: 500 }}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full h-16 bg-accent text-contrast rounded-2xl text-[11px] font-bold tracking-[0.4em] uppercase hover:bg-accent transition-all flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(102,255,102,0.15)]"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              DISPATCH AUTH TOKEN
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
