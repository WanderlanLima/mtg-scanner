import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MarketPage() {
  const navigate = useNavigate();
  const [recentCards, setRecentCards] = useState([]);

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentCards') || '[]');
    setRecentCards(recent);
  }, []);

  return (
    <main className="px-4 max-w-2xl mx-auto space-y-6 pt-8 pb-32">
      <div className="flex items-center gap-3 text-secondary mb-6">
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 0" }}>payments</span>
        <h2 className="font-headline font-extrabold text-2xl tracking-tight">Cotações (Market)</h2>
      </div>

      {recentCards.length === 0 ? (
        <div className="text-center text-outline-variant mt-12 space-y-2">
          <span className="material-symbols-outlined text-5xl">inventory_2</span>
          <p>Nenhuma carta recente. Busque ou escaneie cartas para visualizar suas cotações do Scryfall aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentCards.map(card => (
            <div key={card.name} className="flex gap-4 bg-surface-container-low p-4 rounded-2xl cursor-pointer hover:bg-surface-container-highest transition-colors border border-outline-variant/10" onClick={() => navigate(`/card/${encodeURIComponent(card.name)}`)}>
              <div className="w-16 h-24 shrink-0 rounded-md overflow-hidden bg-surface-container-highest">
                <img src={card.image_uris?.normal || card.image_uris?.large} alt={card.name} className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-headline font-bold text-lg text-on-surface leading-tight truncate">{card.name}</h3>
                
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 bg-surface-container-highest p-2 rounded-lg">
                    <span className="text-[9px] uppercase text-outline block mb-1">Preço de Mercado (BRL)</span>
                    <span className="font-headline font-bold text-md text-primary">
                      {card.prices?.usd ? `R$ ${(parseFloat(card.prices.usd) * 5.50).toFixed(2).replace('.', ',')}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex-1 bg-surface-container-highest p-2 rounded-lg">
                    <span className="text-[9px] uppercase text-outline block mb-1">Preço Original (USD)</span>
                    <span className="font-headline font-bold text-md text-secondary">
                      {card.prices?.usd ? `$ ${card.prices.usd}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
