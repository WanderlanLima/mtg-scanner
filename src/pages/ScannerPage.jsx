import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import ScannerOverlay from '../components/ScannerOverlay';
import { processImageForOCR } from '../utils/imageProcessing';
import { fetchCardByName } from '../services/api';

export default function ScannerPage() {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let stream = null;
    let intervalId = null;

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
      if (!videoRef.current || !scanning) return;
      // Make sure video is ready
      if (videoRef.current.videoWidth === 0) return;
      
      const imageSrc = processImageForOCR(videoRef.current);
      try {
        const result = await Tesseract.recognize(imageSrc, 'eng');
        const text = result.data.text;
        
        // Clean text (alphanumeric, spaces, basic punctuation for card names)
        const cleanText = text.replace(/[^a-zA-Z\s,']/g, '').trim();
        if (cleanText.length > 3) {
          console.log("OCR Detected:", cleanText);
          const card = await fetchCardByName(cleanText);
          if (card) {
            setScanning(false);
            navigate(`/card/${encodeURIComponent(card.name)}`);
          }
        }
      } catch (err) {
        console.error('OCR Error:', err);
      }
    };

    startCamera().then(() => {
      intervalId = setInterval(processFrame, 1500); // scan every 1.5s
    });

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (intervalId) clearInterval(intervalId);
    };
  }, [navigate, scanning]);

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
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover"
      />
      <ScannerOverlay onCancel={() => navigate('/')} />
    </div>
  );
}
