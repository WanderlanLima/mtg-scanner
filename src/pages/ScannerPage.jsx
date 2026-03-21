import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorker } from 'tesseract.js';
import ScannerOverlay from '../components/ScannerOverlay';
import { processImageForOCR } from '../utils/imageProcessing';
import { fetchCardByName } from '../services/api';

export default function ScannerPage() {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    let w = null;
    const initWorker = async () => {
      w = await createWorker('eng');
      setWorker(w);
    };
    initWorker();
    return () => {
      if (w) w.terminate();
    };
  }, []);

  useEffect(() => {
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
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
      }
    };

    const processFrame = async () => {
      if (!videoRef.current || !scanning || !worker || isProcessing) {
        if (scanning) loopId = setTimeout(processFrame, 500);
        return;
      }
      
      if (videoRef.current.videoWidth === 0) {
        loopId = setTimeout(processFrame, 500);
        return;
      }
      
      isProcessing = true;
      const imageSrc = processImageForOCR(videoRef.current);
      
      try {
        const result = await worker.recognize(imageSrc);
        const lines = result.data.text.split('\n');
        
        for (let line of lines) {
            const cleanText = line.replace(/[^a-zA-Z\s,\-']/g, '').trim();
            if (cleanText.length > 3) {
              console.log("OCR Detected:", cleanText);
              const card = await fetchCardByName(cleanText);
              if (card && !card.error) {
                setScanning(false);
                navigate(`/card/${encodeURIComponent(card.name)}`);
                isProcessing = false;
                return;
              }
            }
        }
      } catch (err) {
        console.error('OCR Error:', err);
      }
      
      isProcessing = false;
      if (scanning) loopId = setTimeout(processFrame, 800);
    };

    startCamera().then(() => {
      loopId = setTimeout(processFrame, 1500);
    });

    return () => {
      isProcessing = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (loopId) clearTimeout(loopId);
    };
  }, [navigate, scanning, worker]);

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
    <div className="fixed inset-0 bg-black z-50">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      <ScannerOverlay onCancel={() => navigate('/')} />
    </div>
  );
}
