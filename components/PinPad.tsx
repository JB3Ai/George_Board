
import React, { useState, useEffect } from 'react';
import { Delete, ShieldCheck, ShieldAlert } from 'lucide-react';

interface PinPadProps {
  onComplete: (pin: string, trust: boolean) => void;
  isSetting?: boolean;
}

export const PinPad: React.FC<PinPadProps> = ({ onComplete, isSetting }) => {
  const [pin, setPin] = useState('');
  const [trust, setTrust] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      onComplete(pin, trust);
      setPin('');
    }
  }, [pin, onComplete, trust]);

  const handlePress = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleClear = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center gap-14 w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center flex flex-col gap-4">
        <div className="inline-flex justify-center text-[#66FF66]/40 mb-3">
          <ShieldCheck size={48} strokeWidth={1} className="text-[#66FF66]/60" />
        </div>
        <h2 className="text-lg font-light tracking-[0.4em] text-[#E6E6E6] uppercase">
          {isSetting ? 'Define Vault Key' : 'Security Clearance'}
        </h2>
        <p className="text-[11px] text-[#9AA3AD]/40 tracking-wider font-bold uppercase">
          {isSetting ? 'Finalize 4-digit sequence' : 'Confirm Stakeholder PIN'}
        </p>
      </div>

      <div className="flex gap-8">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border transition-all duration-500 ${
              pin.length > i 
              ? 'bg-[#66FF66] scale-125 shadow-[0_0_20px_rgba(102,255,102,0.5)] border-[#66FF66]' 
              : 'bg-transparent border-white/10'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 w-full px-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handlePress(num)}
            className="w-full aspect-square flex items-center justify-center text-2xl font-light text-[#9AA3AD] hover:text-[#66FF66] hover:bg-[#66FF66]/5 rounded-3xl transition-all border border-white/[0.05] active:scale-90 hover:border-[#66FF66]/20"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          onClick={() => handlePress('0')}
          className="w-full aspect-square flex items-center justify-center text-2xl font-light text-[#9AA3AD] hover:text-[#66FF66] hover:bg-[#66FF66]/5 rounded-3xl transition-all border border-white/[0.05] active:scale-90 hover:border-[#66FF66]/20"
        >
          0
        </button>
        <button
          onClick={handleClear}
          className="w-full aspect-square flex items-center justify-center text-[#9AA3AD]/20 hover:text-red-400 transition-all active:scale-90"
        >
          <Delete size={28} strokeWidth={1} />
        </button>
      </div>

      {!isSetting && (
        <label className="flex items-center gap-4 cursor-pointer group px-8 py-3 rounded-2xl hover:bg-white/[0.02] transition-colors">
          <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${trust ? 'bg-[#66FF66] border-[#66FF66]' : 'border-white/10 group-hover:border-[#66FF66]/40'}`}>
            {trust && <div className="w-2.5 h-2.5 bg-black rounded-[2px]" />}
          </div>
          <input type="checkbox" className="hidden" checked={trust} onChange={e => setTrust(e.target.checked)} />
          <span className="text-[11px] tracking-[0.2em] text-[#9AA3AD]/40 uppercase font-bold group-hover:text-[#66FF66]/60 transition-colors">Trust device for 7 days</span>
        </label>
      )}
    </div>
  );
};
