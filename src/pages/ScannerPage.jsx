import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorker } from 'tesseract.js';
import ScannerOverlay from '../components/ScannerOverlay';
import { findCardContour, warpCardPerspective } from '../utils/cvScanner';
import { fetchCardByName } from '../services/api';

export default function ScannerPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processCanvasRef = useRef(document.createElement('canvas'));
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [worker, setWorker] = useState(null);
  const [cvReady, setCvReady] = useState(false);

  useEffect(() => {
    // Check if OpenCV is loaded
    const checkCv = setInterval(() => {
      if (window.cv && typeof window.cv.Mat === 'function') {
        setCvReady(true);
        clearInterval(checkCv);
      }
    }, 500);

    let w = null;
    const initWorker = async () => {
      w = await createWorker('eng');
      await w.setParameters({
        tessedit_char_whitelist: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,-'"
      });
      setWorker(w);
    };
    initWorker();
    
    return () => {
      clearInterval(checkCv);
      if (w) w.terminate();
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
      if (!videoRef.current || !scanning || !worker || isProcessing) {
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
      const points = findCardContour(videoRef.current);
      
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      
      if (points) {
        // 2. Draw AR polygon mapping the physical card
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

        // 3. Extract and Flatten Perspective
        const warpedImageSrc = warpCardPerspective(videoRef.current, processCanvasRef.current, points);
        
        if (warpedImageSrc) {
           try {
             // 4. Pass only the flat title crop to OCR
             const result = await worker.recognize(warpedImageSrc);
             const lines = result.data.text.split('\n');
             for (let line of lines) {
                const cleanText = line.replace(/[^a-zA-Z\s,\-']/g, '').trim();
                if (cleanText.length > 3) {
                  const card = await fetchCardByName(cleanText);
                  if (card && !card.error) {
                    setScanning(false);
                    navigate(`/card/${encodeURIComponent(card.name)}`);
                    isProcessing = false;
                    return;
                  }
                }
             }
           } catch(e) {
             console.error("OCR falhou:", e);
           }
        }
      }
      
      isProcessing = false;
      if (scanning) {
        setTimeout(() => { loopId = requestAnimationFrame(processFrame); }, 150);
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
  }, [navigate, scanning, worker, cvReady]);

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
