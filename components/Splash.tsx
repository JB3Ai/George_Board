
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [textDone, setTextDone] = useState(false);
  const [videoDone, setVideoDone] = useState(false);

  const completeOnce = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete();
  }, [onComplete]);

  /* ── Step timers: logo → welcome → text done ── */
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setTextDone(true), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  /* ── Start video immediately on mount ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fallback = setTimeout(() => setVideoDone(true), 14000);

    const onCanPlay = () => setVideoReady(true);
    const onEnded = () => { clearTimeout(fallback); setVideoDone(true); };
    const onError = () => { clearTimeout(fallback); setVideoDone(true); };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    let retries = 0;
    const attemptPlay = () => {
      if (hasCompletedRef.current) return;
      video.muted = true;
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          retries += 1;
          if (retries < 8) setTimeout(attemptPlay, 350);
        });
      }
    };

    video.currentTime = 0;
    video.load();
    setTimeout(attemptPlay, 120);

    return () => {
      clearTimeout(fallback);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, []);

  /* ── Complete once BOTH text and video are done ── */
  useEffect(() => {
    if (textDone && videoDone) completeOnce();
  }, [textDone, videoDone, completeOnce]);

  return (
    <div className="fixed inset-0 bg-dark z-[100] flex items-center justify-center overflow-hidden">

      {/* ── Video background layer ── */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: videoReady ? 1 : 0 }}
        transition={{ duration: 1.2 }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
          poster={`${mediaBaseUrl}GTR3.jpeg`}
        >
          <source src={`${mediaBaseUrl}gtr-intro-vid.webm`} type="video/webm" />
          <source src={`${mediaBaseUrl}gtr-intro-vid.mp4`} type="video/mp4" />
        </video>
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/50" />
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
