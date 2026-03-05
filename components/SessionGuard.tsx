
import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Login } from './Login';
import { PinPad } from './PinPad';
import { Splash } from './Splash';
import { InstallInstructionsModal } from './InstallInstructionsModal';
import { UserSession, UserEmail } from '../types';
import { supabaseAuth, isFirstTimeUser } from '../services/auth';
import { userRegistry } from '../services/userRegistry';
import { Mail } from 'lucide-react';
import { useToast } from './Toast';

interface SessionGuardProps {
  children: React.ReactNode;
}

export const SessionGuard: React.FC<SessionGuardProps> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [splashUsername, setSplashUsername] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('jb3_session');
    if (saved) {
      const parsed: UserSession = JSON.parse(saved);
      // If trust was set and has expired, force re-verification.
      // If trust was never set (volatile session), keep pinVerified as-is from the saved state.
      const trustExpired = parsed.trustUntil !== undefined && parsed.trustUntil <= Date.now();
      setSession({ ...parsed, pinVerified: trustExpired ? false : !!parsed.pinVerified });
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

    const firstTime = isFirstTimeUser(session.email);

    if (firstTime) {
      await supabaseAuth.setPin(session.email, pin);
    }

    const result = await supabaseAuth.verifyPin(session.email, pin);

    if (result.success) {
      const verifiedSession: UserSession = {
        ...session,
        pinVerified: true,
        trustUntil: trust ? Date.now() + (7 * 24 * 60 * 60 * 1000) : undefined
      };
      setSession(verifiedSession);
      localStorage.setItem('jb3_session', JSON.stringify(verifiedSession));

      const user = userRegistry.getUserByEmail(session.email);
      setSplashUsername(user?.label || session.email.split('@')[0].toUpperCase());

      showToast(firstTime ? 'PIN Created & Session Authorized' : 'Session Authorized', 'success');
      setShowSplash(true);

      // Show install instructions modal if first time and not previously shown
      if (firstTime && !localStorage.getItem('jb3_install_modal_shown')) {
        setShowInstallModal(true);
        localStorage.setItem('jb3_install_modal_shown', 'true');
      }
    } else {
      showToast(result.error || 'Verification failed', 'error');
    }
    setIsProcessing(false);
  };

  const handlePinResetFromGate = async () => {
    if (!session) return;
    setIsProcessing(true);
    await supabaseAuth.resetPin(session.email);
    localStorage.removeItem('jb3_session');
    setSession(null);
    setIsProcessing(false);
    showToast('PIN reset. Sign in again to define a new PIN.', 'success');
  };

  const firstTime = session ? isFirstTimeUser(session.email) : false;

  return (
    <>
      {showSplash ? (
        <Splash onComplete={() => setShowSplash(false)} username={splashUsername} />
      ) : !session ? (
        <Layout showBackground={false}>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            {isMagicLinkSent ? (
              <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500 text-center">
                <div className="p-5 bg-card/10 rounded-full text-primary/40 animate-pulse">
                  <Mail size={32} strokeWidth={1} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60">Dispatched</h3>
                  <p className="text-[10px] text-primary/20 max-w-[200px] font-light leading-relaxed">Check your secure inbox to finalize session initialization.</p>
                </div>
              </div>
            ) : (
              <Login onLinkSent={handleLinkSent} />
            )}
          </div>
        </Layout>
      ) : !session.pinVerified ? (
        <Layout showBackground={false}>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <PinPad onComplete={handlePinComplete} isSetting={firstTime} onResetPin={handlePinResetFromGate} />
            <button
              onClick={() => setSession(null)}
              className="mt-12 text-[9px] tracking-[0.3em] text-primary/10 hover:text-primary/40 transition-colors uppercase font-bold"
            >
              Cancel Session
            </button>
          </div>
        </Layout>
      ) : (
        <>{children}</>
      )}

      {/* Global overlay — shows after first-time PIN creation, on top of the splash */}
      <InstallInstructionsModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </>
  );
};
