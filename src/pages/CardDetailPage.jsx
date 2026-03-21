import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardPreview from '../components/CardPreview';
import { fetchCardByName, translateText } from '../services/api';

export default function CardDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targetLang, setTargetLang] = useState('pt');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const loadCard = async () => {
      setLoading(true);
      const fetched = await fetchCardByName(id);
      setCard(fetched);
      setLoading(false);
      
      if (fetched) {
        const recent = JSON.parse(localStorage.getItem('recentCards') || '[]');
        const newRecent = [fetched, ...recent.filter(c => c.name !== fetched.name)].slice(0, 10);
        localStorage.setItem('recentCards', JSON.stringify(newRecent));
      }
    };
    loadCard();
  }, [id]);

  useEffect(() => {
    if (card && card.oracle_text) {
      const translate = async () => {
        setIsTranslating(true);
        if (targetLang === 'en') {
           setTranslatedText(card.oracle_text);
           setIsTranslating(false);
           return;
        }
        const text = await translateText(card.oracle_text, targetLang);
        setTranslatedText(text);
        setIsTranslating(false);
      };
      translate();
    }
  }, [card, targetLang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 pb-32 bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 pt-24 pb-32 text-center px-4 bg-background">
        <span className="material-symbols-outlined text-error text-6xl" style={{ fontVariationSettings: "'FILL' 0" }}>error</span>
        <h2 className="text-xl font-headline font-bold text-on-surface">Carta não encontrada</h2>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-surface-container-high rounded-xl font-bold text-primary mt-4 active:scale-95 transition-transform">
          Voltar para Home
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-32 max-w-2xl mx-auto space-y-6 bg-background min-h-screen">
      <header className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
        </button>
        <h1 className="font-headline font-bold text-xl flex-1 text-center pr-12 text-on-surface truncate">{card.name}</h1>
      </header>

      <div className="flex justify-between items-center bg-surface-container-low p-2 px-4 rounded-xl mb-6 border border-outline-variant/10 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-widest text-outline">Idioma da Tradução</span>
        <select 
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="bg-surface-container-highest text-primary font-bold text-sm rounded-lg border-none focus:ring-0 px-3 py-2 cursor-pointer outline-none shadow-sm"
        >
          <option value="pt">Português (BR)</option>
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      <CardPreview 
        card={card}
        translatedText={translatedText}
        isTranslating={isTranslating}
      />
    </div>
  );
}
