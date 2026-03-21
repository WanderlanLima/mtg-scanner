import React from 'react';

export default function ScannerOverlay({ onCancel, cvReady }) {
  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between">
      <div className="w-full p-6 text-center mt-12 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="font-headline font-bold text-white text-xl drop-shadow-md">
          {cvReady ? 'Rastreamento Automático' : 'Carregando Visão Computacional...'}
        </h2>
        <p className="text-white/80 text-sm font-medium mt-1">
          {cvReady ? 'Aponte a câmera livremente para a carta' : 'Isso pode demorar alguns segundos na primeira vez.'}
        </p>
      </div>

      <div className="flex-1"></div>

      <div className="w-full p-8 pb-12 flex justify-center bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
        <button 
          onClick={onCancel}
          className="w-16 h-16 rounded-full bg-surface-container-high/80 backdrop-blur-md flex items-center justify-center text-error border border-error/20 active:scale-90 transition-transform shadow-xl"
        >
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
        </button>
      </div>
    </div>
  )
}
