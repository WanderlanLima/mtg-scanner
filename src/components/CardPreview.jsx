import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CardPreview({ card, translatedText, isTranslating }) {
  const navigate = useNavigate();
  if (!card) return null;

  return (
    <section className="space-y-4 cursor-pointer" onClick={() => navigate(`/card/${encodeURIComponent(card.name)}`)}>
      <h2 className="font-headline font-extrabold text-lg text-primary tracking-tight px-1">Última Descoberta</h2>
      <div className="bg-surface-container-low rounded-[1.25rem] overflow-hidden p-1">
        <div className="bg-surface p-4 rounded-3xl flex flex-col md:flex-row gap-6">
          <div className="relative w-full md:w-64 aspect-[63/88] rounded-xl overflow-hidden bg-surface-container-highest shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <img alt={card.name} className="w-full h-full object-contain p-2" src={card.image_uris?.normal || card.image_uris?.large || ''} />
            <div className="absolute inset-0 border-[3px] border-secondary/40 pointer-events-none rounded-xl"></div>
          </div>
          <div className="flex-1 space-y-4 py-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="font-headline font-bold text-2xl leading-none">{card.name}</h3>
                <p className="text-xs text-outline font-medium tracking-wide uppercase">{card.type_line}</p>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-lg">
                <span className="text-sm font-bold font-headline">{card.mana_cost || '0'}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">Oracle Text</span>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {card.oracle_text || 'No oracle text available.'}
                </p>
              </div>

              {translatedText && (
                <>
                  <div className="h-px w-full bg-outline-variant/20"></div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0" }}>translate</span>
                      Tradução
                    </span>
                    <p className="text-sm text-on-surface italic leading-relaxed">
                      {isTranslating ? 'Traduzindo...' : translatedText}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
