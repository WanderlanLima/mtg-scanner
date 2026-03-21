import React, { useEffect, useState } from 'react';
import { fetchCardRulings, translateText } from '../services/api';

export default function CardRulings({ card, targetLang }) {
  const [originalRulings, setOriginalRulings] = useState([]);
  const [rulings, setRulings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!card || !card.rulings_uri) return;

    const fetchOriginal = async () => {
      setLoading(true);
      const data = await fetchCardRulings(card.rulings_uri);
      setOriginalRulings(data || []);
      setLoading(false);
    };
    fetchOriginal();
  }, [card]);

  useEffect(() => {
    if (originalRulings.length === 0) {
      setRulings([]);
      return;
    }

    if (targetLang === 'en') {
      setRulings(originalRulings.map(r => ({ ...r, displayComment: r.comment })));
      return;
    }

    const translateAll = async () => {
      setTranslating(true);
      // Wait for all translation promises to resolve concurrently
      const translatedData = await Promise.all(
        originalRulings.map(async (r) => {
          const trans = await translateText(r.comment, targetLang);
          return { ...r, displayComment: trans };
        })
      );
      setRulings(translatedData);
      setTranslating(false);
    };

    translateAll();
  }, [originalRulings, targetLang]);

  if (!card) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-headline font-extrabold text-lg text-primary tracking-tight px-1 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>menu_book</span>
        Regras Departamentais (Rulings)
      </h2>
      
      <div className="bg-surface-container-low rounded-[1.25rem] p-1 overflow-hidden shadow-sm">
         <div className="bg-surface p-4 rounded-3xl flex flex-col gap-4">
            {loading ? (
               <div className="flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : originalRulings.length === 0 ? (
               <p className="text-on-surface-variant text-sm italic text-center py-4">
                 Nenhuma regra oficial adicional (Ruling) vinculada a esta carta.
               </p>
            ) : (
               <ul className="space-y-4">
                 {rulings.map((rule, idx) => (
                   <li key={idx} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden transition-all duration-300">
                     <span className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 0" }}>calendar_today</span>
                       {new Date(rule.published_at).toLocaleDateString(targetLang === 'pt' ? 'pt-BR' : 'en-US')}
                     </span>
                     <p className={`text-sm text-on-surface leading-relaxed ${translating ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
                       {translating ? 'Traduzindo regra...' : rule.displayComment}
                     </p>
                     {translating && <div className="absolute inset-x-0 bottom-0 h-1 bg-primary animate-pulse"></div>}
                   </li>
                 ))}
               </ul>
            )}
         </div>
      </div>
    </section>
  );
}
