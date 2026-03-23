import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScannerOverlay from '../components/ScannerOverlay';
import { findCardContour, warpCardPerspective } from '../utils/cvScanner';
import { fetchCardById, searchCardByFuzzyName } from '../services/api';
import { createWorker } from 'tesseract.js';

export default function ScannerPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processCanvasRef = useRef(document.createElement('canvas'));
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [cvReady, setCvReady] = useState(false);
  const [visionStatus, setVisionStatus] = useState('loading');
  const visionStatusRef = useRef('loading'); 
  const tesseractWorkerRef = useRef(null);

  // Hardwares da Câmera (Zoom e Foco)
  const trackRef = useRef(null);
  const [zoomVars, setZoomVars] = useState({ min: 1, max: 1, step: 0.1 });
  const zoomValueRef = useRef(1);
  const forceScanRef = useRef(false); 
  const [debugImage, setDebugImage] = useState(null); 
  const [topMatches, setTopMatches] = useState([]); 
  const [scanMessage, setScanMessage] = useState('Centralize o TÍTULO da Carta...'); 

  useEffect(() => {
    // Verifica Lente OpenCV
    const checkCv = setInterval(() => {
      if (window.cv && typeof window.cv.Mat === 'function') {
        setCvReady(true);
        clearInterval(checkCv);
      }
    }, 500);

    // Inicializa o Tesseract Diretamente
    let active = true;
    (async () => {
        try {
            setVisionStatus('loading');
            const worker = await createWorker('eng');
            if (active) {
               tesseractWorkerRef.current = worker;
               setVisionStatus('ready');
               visionStatusRef.current = 'ready';
               setScanMessage('Leitor Ocular 100% Ativo');
            }
        } catch(e) {
            if (active) setError('Erro ao carregar Sistema Leitor Tesseract.');
        }
    })();

    return () => {
      active = false;
      clearInterval(checkCv);
      if (tesseractWorkerRef.current) tesseractWorkerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (!cvReady) return; 

    let stream = null;
    let isProcessing = false;
    let loopId = null;
    
    let stableFramesCount = 0; 
    let lastCenter = { x: 0, y: 0 };
    let smoothedPoints = null;
    let memoryFrames = 0; 

    const startCamera = async () => {
      try {
        // Exige a maior resolução absoluta que o celular suporta (4K/1080p)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
             facingMode: 'environment', 
             width: { ideal: 4096 }, 
             height: { ideal: 2160 } 
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const [track] = stream.getVideoTracks();
        trackRef.current = track;

        setTimeout(async () => {
           try {
             const capabilities = track.getCapabilities();
             if (capabilities.zoom) {
                setZoomVars({
                   min: capabilities.zoom.min || 1,
                   max: capabilities.zoom.max || 5,
                   step: capabilities.zoom.step || 0.1
                });
                zoomValueRef.current = capabilities.zoom.min || 1;
             }
           } catch(e) {}
        }, 500);

      } catch (err) {
        setError('Não foi possível acessar a câmera.');
      }
    };

    const processFrame = async () => {
      if (!videoRef.current || !scanning || visionStatusRef.current !== 'ready' || isProcessing) {
        if (scanning) loopId = requestAnimationFrame(processFrame);
        return;
      }
      
      if (videoRef.current.videoWidth === 0) {
        loopId = requestAnimationFrame(processFrame);
        return;
      }
      
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      
      if (processCanvasRef.current.width !== w) {
         processCanvasRef.current.width = w;
         processCanvasRef.current.height = h;
      }
      if (canvasRef.current.width !== w) {
         canvasRef.current.width = w;
         canvasRef.current.height = h;
      }

      // 1. Detecta contornos pela lente
      let rawPoints = findCardContour(videoRef.current);
      
      // Memória Fantasma: Se o OpenCV piscar e perder a carta, mantém a caixa colada ali por 5 frames 
      if (!rawPoints && smoothedPoints && memoryFrames < 5) {
         rawPoints = smoothedPoints;
         memoryFrames++;
      } else if (rawPoints) {
         memoryFrames = 0;
      }
      
      // Interpolador Low-Pass Filter: Faz a caixa "Suave" (desliza grudada igual app Nativo)
      let points = null;
      if (rawPoints) {
         if (!smoothedPoints) {
            smoothedPoints = rawPoints;
         } else {
            for (let i = 0; i < 4; i++) {
               // 70% de onde estava, 30% pra onde vai = Movimento Manteiga
               smoothedPoints[i].x = smoothedPoints[i].x * 0.70 + rawPoints[i].x * 0.30;
               smoothedPoints[i].y = smoothedPoints[i].y * 0.70 + rawPoints[i].y * 0.30;
            }
         }
         points = smoothedPoints;
      } else {
         smoothedPoints = null;
      }
      
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      
      let isStabilized = false;

      if (!points) {
         stableFramesCount = 0;
         const cw = w * 0.55; 
         const ch = cw * 1.4; 
         const cx = (w - cw) / 2;
         const cy = (h - ch) / 2;
         const drawPoints = [
            {x: cx, y: cy},
            {x: cx + cw, y: cy},
            {x: cx + cw, y: cy + ch},
            {x: cx, y: cy + ch}
         ];
         ctx.setLineDash([12, 12]);
         ctx.strokeStyle = 'rgba(70, 234, 229, 0.5)';
         ctx.lineWidth = 3;
         ctx.strokeRect(cx, cy, cw, ch);
         ctx.setLineDash([]);
         
         ctx.fillStyle = 'rgba(70, 234, 229, 0.8)';
         ctx.font = 'bold 16px sans-serif';
         ctx.textAlign = 'center';
         ctx.fillText('TOQUE NA TELA', cx + cw / 2, cy + ch / 2 - 10);
         ctx.fillText('PARA FOTOGRAFAR', cx + cw / 2, cy + ch / 2 + 15);
      } else {
        const currentCenter = {
           x: (points[0].x + points[2].x) / 2,
           y: (points[0].y + points[2].y) / 2
        };
        const dx = Math.abs(currentCenter.x - lastCenter.x);
        const dy = Math.abs(currentCenter.y - lastCenter.y);
        
        if (dx < 35 && dy < 35) {
           stableFramesCount++;
        } else {
           stableFramesCount = 0;
        }
        lastCenter = currentCenter;
        
        if (stableFramesCount > 10) {
           isStabilized = true;
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = isStabilized ? '#00ff00' : '#46eae5';
        ctx.stroke();
        ctx.fillStyle = (isStabilized || forceScanRef.current) ? 'rgba(0, 255, 0, 0.4)' : 'rgba(70, 234, 229, 0.2)';
        ctx.fill();
      }

      const forceTriggered = forceScanRef.current;
      if (!isStabilized && !forceTriggered) {
        if (scanning) setTimeout(() => { loopId = requestAnimationFrame(processFrame); }, 50);
        return;
      }
      
      stableFramesCount = 0;
      forceScanRef.current = false; 
      
      // warpedImageSrc agora é APENAS A FAIXA DO TÍTULO DA CARTA (400x55)
      const warpedImageSrc = warpCardPerspective(videoRef.current, processCanvasRef.current, points || [
          {x: (w - (w*0.55))/2, y: (h - (w*0.55)*1.4)/2},
          {x: (w - (w*0.55))/2 + (w*0.55), y: (h - (w*0.55)*1.4)/2},
          {x: (w - (w*0.55))/2 + (w*0.55), y: (h - (w*0.55)*1.4)/2 + (w*0.55)*1.4},
          {x: (w - (w*0.55))/2, y: (h - (w*0.55)*1.4)/2 + (w*0.55)*1.4}
      ]);
      
      setDebugImage(warpedImageSrc); // O Minimapa mostrará a Fita do Nome
      
      if (warpedImageSrc && tesseractWorkerRef.current) {
         isProcessing = true;
         setScanMessage("Lendo o Nome da Carta...");
         
         const processOCR = async () => {
             try {
                // Inferência Instantânea na Imagem Minúscula (150ms)
                const { data } = await tesseractWorkerRef.current.recognize(warpedImageSrc);
                const rawName = data.text.trim();
                
                if (rawName.length < 3) throw new Error("Leitura falhou (Texto Ilegível).");
                
                setScanMessage(`Consultando Nuvem: "${rawName.substring(0, 20)}"`);
                const fullMatches = await searchCardByFuzzyName(rawName);
                
                if (fullMatches && fullMatches.length > 0) {
                    setTopMatches(fullMatches);
                    isProcessing = false;
                    setScanning(false);
                    setScanMessage("Análise Concluída.");
                    return true;
                }
             } catch (err) {
                setScanMessage(err.message || "Erro de Leitura.");
                setTimeout(() => { if(scanning) setScanMessage('Alinhe o Nome da Carta e Aguarde...'); }, 3500);
             }
             return false;
         };
         
         const matched = await processOCR();
         if (matched) return;
         isProcessing = false;
      }
      
      if (scanning) {
        setTimeout(() => { loopId = requestAnimationFrame(processFrame); }, 1500);
      }
    };

    startCamera();
    processFrame();

    return () => {
      isProcessing = true;
      if (loopId) cancelAnimationFrame(loopId);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [navigate, scanning, cvReady]);

  // Touch handlers ... (rest omitted for brevity, keeping existing syntax)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2 && zoomVars.max > 1) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialTouchDistRef.current = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
    } else if (e.touches.length === 1) {
       // Single Tap manual override scan
       forceScanRef.current = true;
       // ... focus indicator logic ...
       const touch = e.touches[0];
       const rect = e.target.getBoundingClientRect();
       const x = touch.clientX - rect.left;
       const y = touch.clientY - rect.top;
       setFocusIndicator({ x, y });
       setTimeout(() => setFocusIndicator(null), 800);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && zoomVars.max > 1 && trackRef.current && initialTouchDistRef.current > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const delta = currentDist - initialTouchDistRef.current;
      
      const zoomFactor = delta > 0 ? zoomVars.step * 2 : -zoomVars.step * 2;
      let newZoom = zoomValueRef.current + zoomFactor;
      newZoom = Math.max(zoomVars.min, Math.min(newZoom, zoomVars.max));
      
      if (Math.abs(newZoom - zoomValueRef.current) > 0.05) {
         zoomValueRef.current = newZoom;
         trackRef.current.applyConstraints({ advanced: [{ zoom: newZoom }] });
         initialTouchDistRef.current = currentDist;
      }
    }
  };

  const handleTouchEnd = () => { initialTouchDistRef.current = 0; };

  return (
    <div 
       className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden touch-none"
       onTouchStart={handleTouchStart}
       onTouchMove={handleTouchMove}
       onTouchEnd={handleTouchEnd}
    >
      {/* Câmera */}
      <video ref={videoRef} autoPlay playsInline className="absolute w-full h-full object-cover" />
      {/* Camada OpenCV Trasparente */}
      <canvas ref={canvasRef} className="absolute w-full h-full object-cover pointer-events-none" />

      {focusIndicator && (
        <div 
          className="absolute border-2 border-yellow-400 rounded-full animate-ping pointer-events-none"
          style={{ 
             left: focusIndicator.x - 25, top: focusIndicator.y - 25, 
             width: 50, height: 50 
          }}
        />
      )}

      {/* OVERLAY GERAL DO SCANNER */}
      <ScannerOverlay 
         onClose={() => navigate('/scanner-bridge')} 
         visionStatus={visionStatus} 
         message={scanMessage}
      />

      {/* HUD DE DEBUG MINIMAPA */}
      {debugImage && (
         <div className="absolute top-20 right-4 w-32 border-2 border-primary rounded-xl overflow-hidden bg-black z-10 shadow-lg pointer-events-none">
             <div className="bg-primary text-black text-[10px] font-bold px-2 py-1 text-center font-mono tracking-widest uppercase">
                 OCR ROI
             </div>
             <img src={debugImage} className="w-full h-auto object-contain" alt="IA Region" />
         </div>
      )}

      {/* BANDEJA DE RESULTADOS MÚLTIPLOS */}
      {!scanning && topMatches.length > 0 && (
         <div className="absolute inset-x-0 bottom-0 bg-surface/90 backdrop-blur-xl rounded-t-3xl shadow-2xl z-50 p-6 pb-8 border-t border-white/10 slide-up max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-on-surface mb-2 tracking-tight">Candidatos Identificados</h2>
             <p className="text-sm text-on-surface-variant mb-6">
                Fuzzy OCR encontrou similaridade de {(topMatches[0].similarity * 100).toFixed(0)}%
            </p>

            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
               {topMatches.map((card, idx) => (
                  <div 
                     key={card.scryfall_id || idx} 
                     className="snap-center shrink-0 w-32 rounded-xl overflow-hidden bg-black shadow-lg cursor-pointer transform transition hover:scale-105 active:scale-95 border border-white/10"
                     onClick={() => navigate(`/scanner-bridge?cardId=${card.scryfall_id}`)}
                  >
                     <img src={card.image_url} alt={card.name} className="w-full h-44 object-cover" />
                     <div className="bg-surface-container p-2 text-center h-full">
                        <p className="text-xs text-on-surface font-semibold truncate leading-tight">{card.name}</p>
                        <p className="text-[10px] text-primary">{card.set_code?.toUpperCase()}</p>
                     </div>
                  </div>
               ))}
            </div>

            <button 
               onClick={() => {
                  setTopMatches([]);
                  setScanning(true);
                  setScanMessage("Centralize o TÍTULO da Carta...");
               }}
               className="mt-6 w-full py-4 bg-surface-container-highest text-on-surface rounded-xl font-bold text-sm tracking-widest uppercase hover:bg-surface-variant transition active:scale-95"
            >
               Escanear Novamente
            </button>
         </div>
      )}

      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-error text-on-error px-6 py-4 rounded-2xl shadow-2xl max-w-sm text-center font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
