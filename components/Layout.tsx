
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  showBackground?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showBackground = true }) => {
  const backgroundUrl = `${import.meta.env.BASE_URL}Media/GTR3.png`;

  return (
    <div className="min-h-screen relative flex flex-col items-center px-6 py-12 md:py-24 overflow-hidden">
      {showBackground ? (
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat"
          style={{ backgroundImage: `url('${backgroundUrl}')` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#0A0C10]" />
      )}
      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      <div className="relative z-10 w-full max-w-4xl flex flex-col gap-12">
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
