
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

    const video = document.getElementById('gtr-intro-video') as HTMLVideoElement | null;
    const complete = () => completeOnce();
    const fallbackTimer = setTimeout(complete, 8000);

    if (!video) {
      return () => clearTimeout(fallbackTimer);
    }

    const onEnded = () => {
      clearTimeout(fallbackTimer);
      complete();
    };

    video.currentTime = 0;
    video.addEventListener('ended', onEnded);
    video.play().catch(() => {
      clearTimeout(fallbackTimer);
      setTimeout(complete, 1800);
    });

    return () => {
      clearTimeout(fallbackTimer);
      video.removeEventListener('ended', onEnded);
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
              id="gtr-intro-video"
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="auto"
              autoPlay
            >
              <source src={`${mediaBaseUrl}gtr-intro-vid.webm`} type="video/webm" />
              <source src={`${mediaBaseUrl}gtr-intro-vid.mp4`} type="video/mp4" />
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
