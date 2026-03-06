
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashProps {
  onComplete: () => void;
  username?: string;
}

export const Splash: React.FC<SplashProps> = ({ onComplete, username }) => {
  const [step, setStep] = useState(0);
  const mediaBaseUrl = `${import.meta.env.BASE_URL}Media/`;
  const hasCompletedRef = useRef(false);
  const [hubVisible, setHubVisible] = useState(false);
  const [textDone, setTextDone] = useState(false);
  const [hubDone, setHubDone] = useState(false);

  const completeOnce = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete();
  }, [onComplete]);

  /* ── Transition Hub image fades in immediately ── */
  useEffect(() => {
    const t = setTimeout(() => setHubVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* ── Hub timer: 1.5s exposure then done ── */
  useEffect(() => {
    const t = setTimeout(() => setHubDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  /* ── Step timers: logo → welcome → text done ── */
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setTextDone(true), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  /* ── Complete once BOTH text and hub are done ── */
  useEffect(() => {
    if (textDone && hubDone) completeOnce();
  }, [textDone, hubDone, completeOnce]);

  return (
    <div className="fixed inset-0 bg-dark z-[100] flex items-center justify-center overflow-hidden">

      {/* ── Transition Hub background image ── */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: hubVisible ? 1 : 0 }}
        transition={{ duration: 1.2 }}
      >
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${mediaBaseUrl}Transition_Hub.jpg')` }}
        />
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/55" />
      </motion.div>

      {/* ── Text overlay steps ── */}
      <div className="relative z-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="w-24 h-24 border-2 border-accent rounded-3xl flex items-center justify-center relative">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  className="absolute inset-0 bg-accent/10 rounded-[22px]"
                />
                <span className="text-2xl font-bold text-accent tracking-[0.08em] relative z-10">JB³Ai</span>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-[10px] tracking-[0.5em] text-accent font-bold uppercase">Initializing</p>
                <div className="w-48 h-[1px] bg-card/10 relative overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-accent"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && !textDone && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-4"
            >
              <h1 className="text-4xl font-light tracking-[0.2em] text-primary uppercase">Welcome, <span className="text-accent font-bold">{username || 'Operator'}</span></h1>
              <p className="text-[11px] tracking-[0.4em] text-primary/20 uppercase font-bold">Secure Stakeholder Environment</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />
    </div>
  );
};
