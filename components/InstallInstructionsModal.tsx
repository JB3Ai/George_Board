import React from 'react';
import { X, Monitor, Smartphone, Tablet } from 'lucide-react';

interface InstallInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallInstructionsModal: React.FC<InstallInstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-dark border border-edge rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        <header className="p-6 border-b border-edge flex items-center justify-between bg-dark/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent text-contrast">
              <Monitor className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-primary">Install App on Your Device</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent/10 rounded-full text-primary transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>
        <div className="p-8 space-y-8">
          <div>
            <h3 className="text-base font-bold text-accent mb-2 flex items-center gap-2"><Monitor className="w-4 h-4" /> Desktop (Windows/Mac/Linux)</h3>
            <ul className="list-disc ml-6 text-[13px] text-primary/80 space-y-1">
              <li>Click your browser's <b>menu</b> (three dots or lines).</li>
              <li>Select <b>Install App</b> or <b>Add to Desktop</b>.</li>
              <li>Follow prompts to add the app to your desktop.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-bold text-accent mb-2 flex items-center gap-2"><Smartphone className="w-4 h-4" /> iOS (iPhone/iPad)</h3>
            <ul className="list-disc ml-6 text-[13px] text-primary/80 space-y-1">
              <li>Tap the <b>Share</b> icon (square with arrow) in Safari.</li>
              <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
              <li>Confirm to add the app icon to your home screen.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-bold text-accent mb-2 flex items-center gap-2"><Tablet className="w-4 h-4" /> Android</h3>
            <ul className="list-disc ml-6 text-[13px] text-primary/80 space-y-1">
              <li>Tap your browser's <b>menu</b> (three dots).</li>
              <li>Select <b>Install App</b> or <b>Add to Home Screen</b>.</li>
              <li>Follow prompts to add the app icon.</li>
            </ul>
          </div>
        </div>
        <footer className="p-6 border-t border-edge text-center text-[12px] text-primary/40">
          You can access the app anytime from your device's home screen or desktop.
        </footer>
      </div>
    </div>
  );
};
