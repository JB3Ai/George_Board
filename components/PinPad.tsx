
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
    <div className="pin-entry-container flex flex-col items-center gap-5 w-full max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hidden input for mobile keyboard & paste support — kept off-screen to prevent scroll */}
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
        onFocus={(e) => { e.target.scrollIntoView = () => {}; window.scrollTo(0, 0); }}
        className="pin-input-field"
        placeholder="ENTER PIN"
        aria-label="Enter 4-digit PIN"
      />
      <div className="text-center flex flex-col gap-2">
        <div className="inline-flex justify-center text-accent/40 mb-1">
          <ShieldCheck size={32} strokeWidth={1} className="text-accent/60" />
        </div>
        <h2 className="text-base font-light tracking-[0.4em] text-primary uppercase">
          {isSetting ? 'Define Vault Key' : 'Security Clearance'}
        </h2>
        <p className="text-[10px] text-muted/40 tracking-wider font-bold uppercase">
          {isSetting ? 'Finalize 4-digit sequence' : 'Confirm Stakeholder PIN'}
        </p>
      </div>

      <div className="flex gap-5">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border transition-all duration-500 ${
              pin.length > i 
              ? 'bg-accent scale-125 shadow-[0_0_20px_rgba(102,255,102,0.5)] border-accent' 
              : 'bg-transparent border-edge'
            }`}
          />
        ))}
      </div>

      <div className="pin-keypad-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handlePress(num)}
            disabled={isSubmitting}
            className="pin-key"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          onClick={() => handlePress('0')}
          disabled={isSubmitting}
          className="pin-key"
        >
          0
        </button>
        <button
          onClick={handleClear}
          disabled={isSubmitting}
          className="pin-key pin-key-delete"
        >
          <Delete size={22} strokeWidth={1} />
        </button>
      </div>

      {!isSetting && (
        <div className="flex flex-col items-center gap-2 mt-1">
          <label className="flex items-center gap-3 cursor-pointer group px-6 py-2 rounded-2xl hover:bg-card/10 transition-colors">
            <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${trust ? 'bg-accent border-accent' : 'border-edge group-hover:border-accent/40'}`}>
              {trust && <div className="w-2 h-2 bg-black rounded-[2px]" />}
            </div>
            <input type="checkbox" className="hidden" checked={trust} onChange={e => setTrust(e.target.checked)} />
            <span className="text-[10px] tracking-[0.2em] text-muted/40 uppercase font-bold group-hover:text-accent/60 transition-colors">Trust device 7 days</span>
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
