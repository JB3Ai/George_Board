
import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange }) => {
  return (
    <div className="relative w-full max-w-sm glass rounded-xl">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/40">
        <Search size={16} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter system logs..."
        className="w-full h-12 bg-transparent rounded-xl pl-11 pr-5 text-[11px] tracking-widest uppercase font-bold text-primary placeholder:text-muted/20 focus:outline-none focus:border-accent/20 transition-all"
      />
    </div>
  );
};
