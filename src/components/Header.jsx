import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar';
import AutocompleteList from './AutocompleteList';
import { searchAutocomplete } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      searchAutocomplete(debouncedSearchTerm).then((results) => {
        setSuggestions(results);
        setShowSuggestions(true);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchTerm]);

  const handleSelectSuggestion = async (name) => {
    setSearchTerm('');
    setShowSuggestions(false);
    navigate(`/card/${encodeURIComponent(name)}`);
  };

  if (location.pathname === '/scan') return null;

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#131316] border-b border-[#474554]/15 px-4 py-4 shadow-md flex flex-col gap-4">
      <div className="flex items-center gap-2 cursor-pointer w-fit" onClick={() => navigate('/')}>
        <span className="material-symbols-outlined text-[#6c5ce7]" style={{ fontVariationSettings: "'FILL' 0" }}>auto_awesome</span>
        <h1 className="font-headline font-bold tracking-tight text-xl text-[#6c5ce7] uppercase tracking-widest">MTG Scanner</h1>
      </div>
      
      <div className="relative w-full max-w-2xl mx-auto">
        <SearchBar 
          value={searchTerm} 
          onChange={setSearchTerm} 
          onFocus={() => setShowSuggestions(true)}
        />
        {showSuggestions && (
          <AutocompleteList 
            suggestions={suggestions} 
            onSelect={handleSelectSuggestion} 
          />
        )}
      </div>
    </header>
  );
}
