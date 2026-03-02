
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

  const completeOnce = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setStep(3), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (step !== 3) return;

    const video = videoRef.current;
    const complete = () => completeOnce();
    const fallbackTimer = setTimeout(complete, 12000);

    if (!video) {
      const noVideoTimer = setTimeout(complete, 2200);
      return () => {
        clearTimeout(fallbackTimer);
        clearTimeout(noVideoTimer);
      };
    }

    const onEnded = () => {
      clearTimeout(fallbackTimer);
      complete();
    };

    const onError = () => {
      clearTimeout(fallbackTimer);
      setTimeout(complete, 1800);
    };

    let retries = 0;
    const attemptPlay = () => {
      if (hasCompletedRef.current) return;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          retries += 1;
          if (retries < 8) {
            setTimeout(attemptPlay, 350);
          }
        });
      }
    };

    video.currentTime = 0;
    video.load();
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    setTimeout(attemptPlay, 120);

    return () => {
      clearTimeout(fallbackTimer);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [step, completeOnce]);

  return (
    <div className="fixed inset-0 bg-[#0A0C10] z-[100] flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="flex flex-col items-center gap-8"
          >
            <div className="w-24 h-24 border-2 border-[#66FF66] rounded-3xl flex items-center justify-center relative">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="absolute inset-0 bg-[#66FF66]/10 rounded-[22px]"
              />
              <span className="text-2xl font-bold text-[#66FF66] tracking-[0.08em] relative z-10">JB³Ai</span>
            </div>
            <div className="space-y-2 text-center">
              <p className="text-[10px] tracking-[0.5em] text-[#66FF66] font-bold uppercase">Initializing</p>
              <div className="w-48 h-[1px] bg-white/5 relative overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-[#66FF66]"
                />
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-4"
          >
            <h1 className="text-4xl font-light tracking-[0.2em] text-white uppercase">Welcome, <span className="text-[#66FF66] font-bold">{username || 'Operator'}</span></h1>
            <p className="text-[11px] tracking-[0.4em] text-white/20 uppercase font-bold">Secure Stakeholder Environment</p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="auto"
            >
              <source src={`${mediaBaseUrl}gtr-intro-vid.mp4`} type="video/mp4" />
              <source src={`${mediaBaseUrl}gtr-intro-vid.webm`} type="video/webm" />
            </video>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#66FF66 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />
    </div>
  );
};
