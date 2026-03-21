import React from 'react';

export default function ScannerOverlay({ onCancel }) {
  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between">
      <div className="w-full p-6 text-center mt-12 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="font-headline font-bold text-white text-lg drop-shadow-md">Posicione a carta</h2>
        <p className="text-white/80 text-sm font-medium mt-1">Lendo automaticamente...</p>
      </div>

      <div className="flex-1 relative flex items-center justify-center pointer-events-none px-8">
        <div className="w-full aspect-[63/88] border-2 border-secondary/50 rounded-xl relative shadow-[0_0_50px_rgba(70,234,229,0.2)]">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-secondary rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-secondary rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-secondary rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-secondary rounded-br-xl"></div>
          
          {/* Scanning line animation */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary shadow-[0_0_10px_#46eae5] animate-[scan_2s_ease-in-out_infinite]"></div>
          
          <div className="absolute top-0 left-0 w-full h-[20%] border-b border-secondary/30 bg-secondary/10 flex items-center justify-center">
            <span className="text-xs uppercase text-secondary/70 font-bold tracking-widest bg-black/50 px-2 rounded">Área de Leitura (Nome)</span>
          </div>
        </div>
      </div>

      <div className="w-full p-8 pb-12 flex justify-center bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
        <button 
          onClick={onCancel}
          className="w-16 h-16 rounded-full bg-surface-container-high/80 backdrop-blur-md flex items-center justify-center text-error border border-error/20 active:scale-90 transition-transform shadow-xl"
        >
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
        </button>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  )
}
