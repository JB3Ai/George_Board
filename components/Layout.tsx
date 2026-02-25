
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 md:py-24">
      <div className="w-full max-w-4xl flex flex-col gap-12">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-light tracking-[0.2em] text-white">CLIPBOARD</h1>
            <div className="h-[1px] w-8 bg-white/20" />
          </div>
          <div className="text-[10px] tracking-widest text-white/30 uppercase">jb³ai secure access</div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
