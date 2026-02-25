
import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Login } from './Login';
import { PinPad } from './PinPad';
import { UserSession, UserEmail } from '../types';
import { supabaseAuth } from '../services/auth';
import { Mail } from 'lucide-react';
import { useToast } from './Toast';

interface SessionGuardProps {
  children: React.ReactNode;
}

export const SessionGuard: React.FC<SessionGuardProps> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('jb3_session');
    if (saved) {
      const parsed: UserSession = JSON.parse(saved);
      const isStillTrusted = parsed.trustUntil && parsed.trustUntil > Date.now();
      setSession({ ...parsed, pinVerified: !!isStillTrusted });
    }
  }, []);

  const handleLinkSent = (email: string) => {
    setIsMagicLinkSent(true);
    // In production, we'd wait for the Supabase auth state change. 
    // For prototype, we move to PIN after a short wait.
    setTimeout(() => {
      setSession({ email: email as UserEmail, pinVerified: false });
      setIsMagicLinkSent(false);
    }, 2000);
  };

  const handlePinComplete = async (pin: string, trust: boolean) => {
    if (!session) return;
    setIsProcessing(true);

    const result = await supabaseAuth.verifyPin(session.email, pin);

    if (result.success) {
      const verifiedSession: UserSession = {
        ...session,
        pinVerified: true,
        trustUntil: trust ? Date.now() + (7 * 24 * 60 * 60 * 1000) : undefined
      };
      setSession(verifiedSession);
      localStorage.setItem('jb3_session', JSON.stringify(verifiedSession));
      showToast('Session Authorized', 'success');
    } else {
      showToast(result.error || 'Verification failed', 'error');
    }
    setIsProcessing(false);
  };

  if (!session) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {isMagicLinkSent ? (
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="p-5 bg-white/5 rounded-full text-white/40 animate-pulse">
                <Mail size={32} strokeWidth={1} />
              </div>
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/60">Dispatched</h3>
                <p className="text-[10px] text-white/20 max-w-[200px] font-light leading-relaxed">Check your secure inbox to finalize session initialization.</p>
              </div>
            </div>
          ) : (
            <Login onLinkSent={handleLinkSent} />
          )}
        </div>
      </Layout>
    );
  }

  if (!session.pinVerified) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <PinPad onComplete={handlePinComplete} isSetting={false} />
          <button 
            onClick={() => setSession(null)} 
            className="mt-12 text-[9px] tracking-[0.3em] text-white/10 hover:text-white/40 transition-colors uppercase font-bold"
          >
            Cancel Session
          </button>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
};
