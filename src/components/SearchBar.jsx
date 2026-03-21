export default function SearchBar({ value, onChange, onFocus }) {
  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span className="material-symbols-outlined text-outline" style={{ fontVariationSettings: "'FILL' 0" }}>search</span>
      </div>
      <input 
        className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest border-none rounded-xl text-on-surface placeholder:text-outline/60 focus:ring-0 focus:outline-none focus:bg-surface-container-low transition-all" 
        placeholder="Digite o nome da carta..." 
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
      />
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary-container scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 origin-left"></div>
    </div>
  )
}
