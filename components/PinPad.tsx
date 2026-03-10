
import React, { useState, useEffect, useRef } from 'react';
import { Delete, ShieldCheck, ShieldAlert } from 'lucide-react';

interface PinPadProps {
  onComplete: (pin: string, trust: boolean) => void;
  isSetting?: boolean;
  onResetPin?: () => void;
  resetKey?: number;
}

export const PinPad: React.FC<PinPadProps> = ({ onComplete, isSetting, onResetPin, resetKey }) => {
  const [pin, setPin] = useState('');
  const [trust, setTrust] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus lock — grab focus on mount and re-grab on any click
  useEffect(() => {
    const el = inputRef.current;
    el?.focus();
    const handleGlobalClick = () => el?.focus();
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // External reset trigger — clear PIN when parent signals failure
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setPin('');
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }, [resetKey]);

  useEffect(() => {
    if (pin.length !== 4 || isSubmitting) return;

    let isActive = true;
    setIsSubmitting(true);

    Promise.resolve(onComplete(pin, trust))
      .finally(() => {
        if (!isActive) return;
        setPin('');
        setIsSubmitting(false);
      });

    return () => {
      isActive = false;
    };
  }, [pin, onComplete, trust]);

  const handlePress = (num: string) => {
    if (isSubmitting) return;
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleClear = () => {
    if (isSubmitting) return;
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="pin-entry-container flex flex-col items-center gap-14 w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hidden input for mobile keyboard & paste support */}
      <input
        ref={inputRef}
        id="os3-pin-input"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        autoFocus
        maxLength={4}
        value={pin}
        onChange={(e) => {
          if (isSubmitting) return;
          const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
          setPin(digits);
        }}
        className="pin-input-field"
        placeholder="ENTER PIN"
        aria-label="Enter 4-digit PIN"
      />
      <div className="text-center flex flex-col gap-4">
        <div className="inline-flex justify-center text-accent/40 mb-3">
          <ShieldCheck size={48} strokeWidth={1} className="text-accent/60" />
        </div>
        <h2 className="text-lg font-light tracking-[0.4em] text-primary uppercase">
          {isSetting ? 'Define Vault Key' : 'Security Clearance'}
        </h2>
        <p className="text-[11px] text-muted/40 tracking-wider font-bold uppercase">
          {isSetting ? 'Finalize 4-digit sequence' : 'Confirm Stakeholder PIN'}
        </p>
      </div>

      <div className="flex gap-8">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border transition-all duration-500 ${
              pin.length > i 
              ? 'bg-accent scale-125 shadow-[0_0_20px_rgba(102,255,102,0.5)] border-accent' 
              : 'bg-transparent border-edge'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 w-full px-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handlePress(num)}
            disabled={isSubmitting}
            className="w-full aspect-square flex items-center justify-center text-2xl font-light text-muted hover:text-accent hover:bg-accent/5 rounded-3xl transition-all border border-edge active:scale-90 hover:border-accent/20"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          onClick={() => handlePress('0')}
          disabled={isSubmitting}
          className="w-full aspect-square flex items-center justify-center text-2xl font-light text-muted hover:text-accent hover:bg-accent/5 rounded-3xl transition-all border border-edge active:scale-90 hover:border-accent/20"
        >
          0
        </button>
        <button
          onClick={handleClear}
          disabled={isSubmitting}
          className="w-full aspect-square flex items-center justify-center text-muted/20 hover:text-red-400 transition-all active:scale-90"
        >
          <Delete size={28} strokeWidth={1} />
        </button>
      </div>

      {!isSetting && (
        <div className="flex flex-col items-center gap-4">
          <label className="flex items-center gap-4 cursor-pointer group px-8 py-3 rounded-2xl hover:bg-card/10 transition-colors">
            <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${trust ? 'bg-accent border-accent' : 'border-edge group-hover:border-accent/40'}`}>
              {trust && <div className="w-2.5 h-2.5 bg-black rounded-[2px]" />}
            </div>
            <input type="checkbox" className="hidden" checked={trust} onChange={e => setTrust(e.target.checked)} />
            <span className="text-[11px] tracking-[0.2em] text-muted/40 uppercase font-bold group-hover:text-accent/60 transition-colors">Trust device for 7 days</span>
          </label>

          {onResetPin && (
            <button
              type="button"
              onClick={onResetPin}
              disabled={isSubmitting}
              className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted/40 hover:text-red-400 transition-colors"
            >
              Reset PIN
            </button>
          )}
        </div>
      )}
    </div>
  );
};
