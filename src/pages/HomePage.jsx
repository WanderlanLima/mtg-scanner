import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <main className="px-4 max-w-2xl mx-auto space-y-8">
      <section className="space-y-6 flex flex-col items-center justify-center pt-12 pb-8">
        <span className="material-symbols-outlined text-outline text-6xl" style={{ fontVariationSettings: "'FILL' 0" }}>travel_explore</span>
        <h2 className="text-xl font-headline font-bold text-center text-on-surface">Comece a explorar</h2>
        <p className="text-center text-on-surface-variant max-w-sm">Use a barra de pesquisa acima para encontrar cartas ou abra o scanner de câmera.</p>
        
        <button 
          onClick={() => navigate('/scan')}
          className="w-full py-4 px-6 flex items-center justify-center gap-3 bg-gradient-to-br from-[#c6bfff] to-[#6c5ce7] text-white font-headline font-bold rounded-xl shadow-[0_10px_30px_rgba(108,92,231,0.3)] active:scale-95 transition-transform duration-200 mt-4"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>center_focus_strong</span>
          <span>Escanear carta com a câmera</span>
        </button>
      </section>
    </main>
  );
}
