import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScannerOverlay from '../components/ScannerOverlay';
import { findCardContour, warpCardPerspective } from '../utils/cvScanner';
import { fetchCardById, matchCardByEmbedding } from '../services/api';
import VisionWorker from '../workers/visionWorker.js?worker';

export default function ScannerPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processCanvasRef = useRef(document.createElement('canvas'));
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [cvReady, setCvReady] = useState(false);
  const visionWorkerRef = useRef(null);
  const [visionStatus, setVisionStatus] = useState('loading');
  const visionStatusRef = useRef('loading'); // mantemos o Ref para o requestAnimationFrame de alta velocidade

  // Hardwares da Câmera (Zoom e Foco)
  const trackRef = useRef(null);
  const [zoomVars, setZoomVars] = useState({ min: 1, max: 1, step: 0.1 });
  const zoomValueRef = useRef(1);
  const initialTouchDistRef = useRef(0);
  const forceScanRef = useRef(false); // Override manual para disparar a foto
  const [focusIndicator, setFocusIndicator] = useState(null); // {x, y}
  const [debugImage, setDebugImage] = useState(null); // Mini-mapa do Frame da IA
  const [topMatches, setTopMatches] = useState([]); // Array de top predictions da IA

  useEffect(() => {
    // Verifica Lente OpenCV
    const checkCv = setInterval(() => {
      if (window.cv && typeof window.cv.Mat === 'function') {
        setCvReady(true);
        clearInterval(checkCv);
      }
    }, 500);

    let stableFramesCount = 0;
    let lastCenter = { x: 0, y: 0 };

    visionWorkerRef.current = new VisionWorker();
    visionWorkerRef.current.onmessage = (e) => {
      const { status, message } = e.data;
      
      if (status === 'ready') {
         visionStatusRef.current = 'ready';
         setVisionStatus('ready');
      } else if (status === 'error') {
         setVisionStatus('error');
         setError(`Terminal IA Crash: ${message || 'Erro Desconhecido'}`);
      }
    };

    return () => {
      clearInterval(checkCv);
      if (visionWorkerRef.current) visionWorkerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (!cvReady) return; 

    let stream = null;
    let isProcessing = false;
    let loopId = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Pega os controles avançados da lente
        const [track] = stream.getVideoTracks();
        trackRef.current = track;

        // Aguarda a câmera estabilizar pra extrair capacidades suportadas do celular
        setTimeout(() => {
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
      
      isProcessing = true;
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
      let points = findCardContour(videoRef.current);
      
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      
      let isStabilized = false;

      if (!points) {
         stableFramesCount = 0;
         const cw = w * 0.55; 
         const ch = cw * 1.4; 
         const cx = (w - cw) / 2;
         const cy = (h - ch) / 2;
         points = [
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
      } else {
        // Checa estabilidade
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

      if (!isStabilized && !forceScanRef.current) {
        if (scanning) setTimeout(() => { loopId = requestAnimationFrame(processFrame); }, 50);
        return;
      }
      
      stableFramesCount = 0;
      forceScanRef.current = false; // Consome o disparo manual overrides
      const warpedImageSrc = warpCardPerspective(videoRef.current, processCanvasRef.current, points);
      
      if (warpedImageSrc && visionWorkerRef.current) {
         const processVision = new Promise((resolve) => {
            const onWorkerMessage = async (e) => {
               const { status, embedding, message } = e.data;
               visionWorkerRef.current.removeEventListener('message', onWorkerMessage);
               
               if (status === 'success') {
                  const matches = await matchCardByEmbedding(embedding);
                  if (matches && matches.length > 0) {
                     setTopMatches(matches);
                     isProcessing = false;
                     // Não resolve o scan para `true` para continuarmos operando, ou resolve para `false` 
                     // Na verdade, se encontrou as cartas, pausamos o scan e deixamos a UI decidir
                     setScanning(false);
                     resolve(true);
                     return;
                  }
               }
               resolve(false); 
            };
            
            visionWorkerRef.current.addEventListener('message', onWorkerMessage);
            visionWorkerRef.current.postMessage({ imageBase64: warpedImageSrc });
         });
         
         const matched = await processVision;
         if (matched) {
           return; 
         }
      }
      
      isProcessing = false;
      if (scanning) {
        setTimeout(() => { loopId = requestAnimationFrame(processFrame); }, 400);
      }
    };

    startCamera().then(() => {
      loopId = requestAnimationFrame(processFrame);
    });

    return () => {
      isProcessing = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (loopId) cancelAnimationFrame(loopId);
    };
  }, [navigate, scanning, cvReady]);

  // Gestos de Touch na Câmera (Zoom Pinça e Tap to Focus)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2 && trackRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && trackRef.current && zoomVars.max > 1) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      
      const scale = currentDist / initialTouchDistRef.current;
      initialTouchDistRef.current = currentDist;

      let newZoom = zoomValueRef.current * scale;
      newZoom = Math.min(Math.max(newZoom, zoomVars.min), zoomVars.max);
      
      try {
        trackRef.current.applyConstraints({ advanced: [{ zoom: newZoom }] });
        zoomValueRef.current = newZoom;
      } catch (err) {}
    }
  };

  const handleTapToFocus = async (e) => {
    if (e.touches && e.touches.length > 1) return; // Ignora se for o gesto de pinça
    
    // Calcula coordenadas para o visual de Foco
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX;
    const y = touch.clientY;
    
    // Efeito visual do Foco
    setFocusIndicator({ x, y });
    setTimeout(() => setFocusIndicator(null), 800);

    // API de Câmera Macro Automática
    if (trackRef.current) {
      try {
        const capabilities = trackRef.current.getCapabilities();
        const constraint = { focusMode: 'continuous' };
        
        // Dispositivos modernos suportam ponto gravitacional de interesse
        if (capabilities.pointsOfInterest) {
          const normX = x / window.innerWidth;
          const normY = y / window.innerHeight;
          constraint.pointsOfInterest = [{ x: normX, y: normY }];
        }
        
        await trackRef.current.applyConstraints({ advanced: [constraint] });
      } catch(err) {} 
    }

    // Força o disparo da Foto Instantaneamente (Ignora estabilização do OpenCV para focar em Telas que piscam!)
    forceScanRef.current = true;
  };

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background px-6 text-center z-50 fixed inset-0">
        <span className="material-symbols-outlined text-error text-6xl mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>error</span>
        <h2 className="text-on-surface font-headline font-bold text-xl">{error}</h2>
        <button onClick={() => navigate('/')} className="mt-8 px-6 py-3 bg-surface-container-high rounded-xl text-primary font-bold active:scale-95 transition-transform">Voltar para o Início</button>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black z-50 overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onClick={handleTapToFocus}
    >
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      
      {/* Mira Quadrada de Foco ao Tocar */}
      {focusIndicator && (
        <div 
          className="absolute border-2 border-primary rounded-md pointer-events-none animate-ping"
          style={{
            left: focusIndicator.x - 30,
            top: focusIndicator.y - 30,
            width: 60,
            height: 60,
            animationDuration: '800ms'
          }}
        />
      )}
      
      {/* Overlay Navbar Esconde Cliques, precisamos ajustar z-index ou click-through, mas no App não há botões massivos no overlay de topo */}
      <ScannerOverlay onCancel={() => navigate('/')} cvReady={cvReady} />

      {/* Sobreposição de Dúvida da IA: Lista de Cartas Semelhantes Encontradas */}
      {topMatches.length > 0 && !scanning && (
        <div className="absolute inset-x-0 bottom-0 bg-surface-container-high/95 backdrop-blur-lg pt-4 pb-8 px-4 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 animate-in slide-in-from-bottom flex flex-col items-center">
           <h3 className="text-on-surface text-center mb-4 font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">robot_2</span> A IA ficou na dúvida, qual delas é a sua?
           </h3>
           <div className="flex w-full gap-4 overflow-x-auto pb-4 snap-x">
             {topMatches.slice(0, 10).map((card, i) => (
               <div 
                 key={i} 
                 onClick={() => navigate(`/card/${encodeURIComponent(card.name)}`)}
                 className="flex-none w-32 snap-center rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
               >
                 <img src={card.image_url} alt={card.name} className="w-full h-44 object-cover" />
                 <div className="bg-surface-container p-2 text-center h-full">
                    <p className="text-xs text-on-surface font-semibold truncate leading-tight">{card.name}</p>
                    <p className="text-[10px] text-primary">Score: {(card.similarity * 100).toFixed(1)}%</p>
                 </div>
               </div>
             ))}
           </div>
           <button 
             onClick={() => { setTopMatches([]); setScanning(true); }}
             className="mt-2 bg-secondary text-on-secondary px-8 py-2 rounded-full font-bold shadow-lg"
           >
              Mire Novamente na Carta
           </button>
        </div>
      )}

      {/* Mini-Mapa de Debug (Visão da IA) - Mantido limpo quando Top Matches aparecerem */}
      {debugImage && topMatches.length === 0 && (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-none border-2 border-primary rounded-lg overflow-hidden shadow-2xl bg-black">
          <img src={debugImage} alt="Visão IA" className="w-24 h-auto opacity-90" />
          <div className="bg-black/80 text-[10px] text-white text-center py-1">FRAME IA</div>
        </div>
      )}

      {/* Painel Crítico de Carregamento da Inteligência Artificial */}
      {visionStatus === 'loading' && (
        <div className="absolute inset-x-0 top-32 flex justify-center z-[100] px-4">
           <div className="bg-surface-container-high/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-primary/30 shadow-2xl flex items-center space-x-4 animate-pulse">
              <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
              <div>
                 <p className="text-on-surface font-bold text-sm">Transferindo IA Global...</p>
                 <p className="text-on-surface-variant text-xs">Aguarde. Carregando Cérebro HuggingFace (~70MB).</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
