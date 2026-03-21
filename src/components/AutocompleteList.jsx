export default function AutocompleteList({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="glass-panel rounded-xl p-4 space-y-1 border border-outline-variant/10 absolute top-full left-0 right-0 mt-2 z-50 shadow-2xl">
      <span className="text-[10px] font-bold uppercase tracking-widest text-outline px-2 pb-2 block">Sugestões</span>
      <div className="flex flex-col max-h-60 overflow-y-auto">
        {suggestions.map((name, index) => (
          <button 
            key={index}
            onClick={() => onSelect(name)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-highest transition-colors text-left group"
          >
            <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>search</span>
            <span className="text-sm font-medium text-on-surface">{name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
