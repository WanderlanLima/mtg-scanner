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
  const visionStatusRef = useRef('loading');

  useEffect(() => {
    // Check if OpenCV is loaded
    const checkCv = setInterval(() => {
      if (window.cv && typeof window.cv.Mat === 'function') {
        setCvReady(true);
        clearInterval(checkCv);
      }
    }, 500);

    // Initialize the AI Vision Worker safely using Vite's ?worker import
    visionWorkerRef.current = new VisionWorker();

    visionWorkerRef.current.onmessage = (e) => {
      const { status } = e.data;
      if (status === 'ready') visionStatusRef.current = 'ready';
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
      } catch (err) {
        setError('Não foi possível acessar a câmera.');
      }
    };

    const processFrame = async () => {
      // Use the ref so we don't need visionStatus in the useEffect dependencies
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
      
      // Update canvas dimensions automatically matching video feed
      if (processCanvasRef.current.width !== w) {
         processCanvasRef.current.width = w;
         processCanvasRef.current.height = h;
      }
      if (canvasRef.current.width !== w) {
         canvasRef.current.width = w;
         canvasRef.current.height = h;
      }

      // 1. Detect contour via OpenCV
      let points = findCardContour(videoRef.current);
      
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      
      if (!points) {
         // Hybrid Fallback: If edge tracking drops due to trembling or blur, use standard center box
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
         // Draw subtle dashed targeting guide
         ctx.setLineDash([12, 12]);
         ctx.strokeStyle = 'rgba(70, 234, 229, 0.5)';
         ctx.lineWidth = 3;
         ctx.strokeRect(cx, cy, cw, ch);
         ctx.setLineDash([]);
      } else {
        // 2. Draw AR polygon mapping the physical card securely
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#46eae5';
        ctx.stroke();
        ctx.fillStyle = 'rgba(70, 234, 229, 0.2)';
        ctx.fill();
      }

        // 3. Extract and Flatten Perspective
        // We now extract the entire card, not just the title, for full embedding match
        // Because warpCardPerspective sets canvas size to 400x560 for title OCR, wait, cvScanner exports a crop!
        // The original cvScanner returned the top 1/4 of the card. Let's still pass it, since CLIP processes what it gets.
        // For best results, we should send the full canvas.
        const warpedImageSrc = warpCardPerspective(videoRef.current, processCanvasRef.current, points);
        
        if (warpedImageSrc && visionWorkerRef.current) {
           isProcessing = true; // Wait for async worker response
           
           const processVision = new Promise((resolve) => {
              const onWorkerMessage = async (e) => {
                 const { status, embedding, message } = e.data;
                 visionWorkerRef.current.removeEventListener('message', onWorkerMessage);
                 
                 if (status === 'success') {
                    const match = await matchCardByEmbedding(embedding);
                    if (match) {
                      const fullCard = await fetchCardById(match.scryfall_id);
                      if (fullCard && !fullCard.error) {
                         setScanning(false);
                         navigate(`/card/${encodeURIComponent(fullCard.name)}`);
                         resolve(true); // Matched
                         return;
                      }
                    }
                 } else {
                    console.error("Vision Worker Error:", message);
                 }
                 resolve(false); // No match
              };
              
              visionWorkerRef.current.addEventListener('message', onWorkerMessage);
              visionWorkerRef.current.postMessage({ imageBase64: warpedImageSrc });
           });
           
           const matched = await processVision;
           if (matched) return; // Exit loop, nav triggers
        }
      
      isProcessing = false;
      if (scanning) {
        setTimeout(() => { loopId = requestAnimationFrame(processFrame); }, 400); // 400ms cooldown for heavy vectorization
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
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      
      <ScannerOverlay onCancel={() => navigate('/')} cvReady={cvReady} />
    </div>
  );
}
