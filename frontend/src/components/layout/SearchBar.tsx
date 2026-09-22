import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  className = '',
  placeholder = 'Search records, doctors, prescriptions, reports...',
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center w-full max-w-md ${className}`}
      role="search"
    >
      <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Universal health search"
        className="w-full pl-10 pr-12 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-sky-300 rounded-xl text-xs md:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-sky-500/20"
      />
      <div className="absolute right-3 hidden sm:flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-md shadow-2xs pointer-events-none">
        <span>⌘</span>K
      </div>
    </form>
  );
};
