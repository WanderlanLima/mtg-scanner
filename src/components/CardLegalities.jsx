import React from 'react';

const FORMAT_NAMES = {
  standard: 'Standard',
  pioneer: 'Pioneer',
  modern: 'Modern',
  legacy: 'Legacy',
  vintage: 'Vintage',
  commander: 'Commander',
  pauper: 'Pauper',
};

const getStatusColor = (status) => {
  switch (status) {
    case 'legal':
      return 'bg-green-500/15 text-green-400 border-green-500/20';
    case 'not_legal':
      return 'bg-surface-container-high text-on-surface-variant border-transparent';
    case 'banned':
      return 'bg-red-500/15 text-red-400 border-red-500/20';
    case 'restricted':
      return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
    default:
      return 'bg-surface-container text-on-surface-variant border-transparent';
  }
};

const formatTranslation = {
  legal: 'Válido',
  not_legal: 'Inválido',
  banned: 'Banido',
  restricted: 'Restrito',
};

export default function CardLegalities({ card }) {
  if (!card || !card.legalities) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-headline font-extrabold text-lg text-primary tracking-tight px-1 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>gavel</span>
        Legalidade em Formatos
      </h2>
      <div className="bg-surface-container-low rounded-[1.25rem] p-4 border border-outline-variant/10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(FORMAT_NAMES).map(([key, label]) => {
            const status = card.legalities[key];
            if (!status) return null;
            return (
              <div key={key} className={`flex flex-col items-center justify-center p-3 rounded-xl border ${getStatusColor(status)} shadow-sm transition-colors`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</span>
                <span className="text-sm font-bold mt-1">{formatTranslation[status] || status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
