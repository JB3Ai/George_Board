
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
        <div className="inline-flex items-center justify-center p-8 bg-[#66FF66]/5 border border-[#66FF66]/10 rounded-[2.5rem] mb-6 shadow-2xl">
          <ShieldCheck size={48} strokeWidth={1} className="text-[#66FF66]" />
        </div>
        <h2 className="text-lg font-light tracking-[0.4em] text-[#E6E6E6] uppercase">Stakeholder Portal</h2>
        <p className="text-[11px] text-[#9AA3AD]/60 tracking-wider font-bold uppercase">Authorization Layer V3</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="relative group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9AA3AD]/40 group-focus-within:text-[#66FF66] transition-colors">
            <Mail size={20} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            placeholder="Authorized Stakeholder Email"
            className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-6 text-base text-[#E6E6E6] focus:outline-none focus:border-[#66FF66]/30 transition-all font-light"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full h-16 bg-[#66FF66] text-black rounded-2xl text-[11px] font-bold tracking-[0.4em] uppercase hover:bg-[#80FF80] transition-all flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(102,255,102,0.15)]"
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
