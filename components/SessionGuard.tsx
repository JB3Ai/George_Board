
import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Login } from './Login';
import { PinPad } from './PinPad';
import { Splash } from './Splash';
import { InstallInstructionsModal } from './InstallInstructionsModal';
import { UserSession, UserEmail } from '../types';
import { supabaseAuth, checkPinStatus } from '../services/auth';
import { supabase } from '../services/supabaseClient';
import { userRegistry } from '../services/userRegistry';
import { Mail } from 'lucide-react';
import { useToast } from './Toast';
import { useUI } from '../src/context/UIContext';

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
  const [isSetting, setIsSetting] = useState(false);
  const [pinResetKey, setPinResetKey] = useState(0);
  const { showToast } = useToast();
  const { welcomeVideoEnabled, installGuideEnabled } = useUI();

  useEffect(() => {
    const saved = localStorage.getItem('jb3_session');
    if (saved) {
      try {
        const parsed: UserSession = JSON.parse(saved);
        const isTrusted = parsed.trustUntil && Date.now() < parsed.trustUntil;
        if (isTrusted && parsed.pinVerified) {
          // Trust window still active — skip PIN
          setSession(parsed);
        } else {
          // Expired or no trust — require PIN re-entry
          setSession({ email: parsed.email, pinVerified: false });
        }
      } catch {
        localStorage.removeItem('jb3_session');
      }
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

    // Check server-side if user has a PIN set
    const status = await checkPinStatus(session.email);

    if (status.locked) {
      showToast(status.error || 'Account locked. Try again later.', 'error');
      setPinResetKey(k => k + 1);
      setIsProcessing(false);
      return;
    }

    const firstTime = !status.has_pin;

    if (firstTime) {
      // No PIN exists — set one
      const setResult = await supabaseAuth.setPin(session.email, pin);
      if (!setResult.success) {
        showToast(setResult.error || 'Failed to set PIN', 'error');
        setPinResetKey(k => k + 1);
        setIsProcessing(false);
        return;
      }
    }

    // Verify the PIN (even after setting — confirms hash round-trip)
    const result = await supabaseAuth.verifyPin(session.email, pin);

    if (result.success) {
      // Phase 4.3: Exchange token for real Supabase Auth session (activates JWT-based RLS)
      if (result.token_hash && supabase) {
        try {
          await supabase.auth.verifyOtp({ token_hash: result.token_hash, type: 'magiclink' });
        } catch {
          // Non-fatal: app works without JWT session, board RLS stays dormant
          console.warn('Supabase session exchange failed — board RLS inactive');
        }
      }

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
      if (welcomeVideoEnabled) {
        setShowSplash(true);
      } else if (installGuideEnabled) {
        setShowInstallModal(true);
      }
    } else {
      const msg = result.attempts_remaining !== undefined && result.attempts_remaining <= 2
        ? `Verification failed. ${result.attempts_remaining} attempt${result.attempts_remaining === 1 ? '' : 's'} remaining.`
        : result.error || 'Verification failed';
      showToast(msg, 'error');
      setPinResetKey(k => k + 1);
    }
    setIsProcessing(false);
  };

  const handlePinResetFromGate = async () => {
    if (!session) return;
    setIsProcessing(true);
    if (supabase) await supabase.auth.signOut();
    await supabaseAuth.resetPin(session.email);
    localStorage.removeItem('jb3_session');
    setSession(null);
    setIsProcessing(false);
    showToast('PIN reset. Sign in again to define a new PIN.', 'success');
  };

  // Determine first-time status when session exists but PIN not yet verified
  useEffect(() => {
    if (session && !session.pinVerified) {
      checkPinStatus(session.email).then((status) => {
        setIsSetting(!status.has_pin);
      });
    }
  }, [session?.email, session?.pinVerified]);

  const handleSplashComplete = () => {
    setShowSplash(false);
    if (installGuideEnabled) {
      setShowInstallModal(true);
    }
  };

  return (
    <>
      {showSplash ? (
        <Splash onComplete={handleSplashComplete} username={splashUsername} />
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
            <PinPad onComplete={handlePinComplete} isSetting={isSetting} onResetPin={handlePinResetFromGate} resetKey={pinResetKey} />
            <button
              onClick={async () => {
                if (supabase) await supabase.auth.signOut();
                setSession(null);
              }}
              className="mt-12 text-[9px] tracking-[0.3em] text-primary/10 hover:text-primary/40 transition-colors uppercase font-bold"
            >
              Cancel Session
            </button>
          </div>
        </Layout>
      ) : (
        <>{children}</>
      )}

      {/* Install guide — shown after splash completes, on top of the clipboard */}
      <InstallInstructionsModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </>
  );
};
