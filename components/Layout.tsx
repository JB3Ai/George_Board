
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  showBackground?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showBackground = true }) => {
  const backgroundUrl = `${import.meta.env.BASE_URL}Media/GTR4.jpeg`;

  return (
    <div className="min-h-screen relative flex flex-col items-center px-6 py-12 md:py-24 overflow-hidden">
      {showBackground ? (
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat pointer-events-none"
          style={{ backgroundImage: `url('${backgroundUrl}')`, zIndex: 0 }}
        />
      ) : (
        <div className="absolute inset-0 bg-dark pointer-events-none" style={{ zIndex: 0 }} />
      )}
      <div className="absolute inset-0 bg-black/75 pointer-events-none" style={{ zIndex: 1 }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" style={{ zIndex: 2 }} />

      <div className="relative w-full max-w-4xl flex flex-col gap-12" style={{ zIndex: 500 }}>
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-light tracking-[0.2em] text-primary">CLIPBOARD</h1>
            <div className="h-[1px] w-8 bg-card/10" />
          </div>
          <div className="text-[10px] tracking-widest text-primary/30 uppercase">jb³ai secure access</div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
