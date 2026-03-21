export function processImageForOCR(videoElement) {
  const canvas = document.createElement('canvas');
  const w = videoElement.videoWidth;
  const h = videoElement.videoHeight;
  
  // Crop a region in the upper-middle where the card name actually overlays natively
  const cropW = w * 0.8;
  const cropH = h * 0.4;
  const startX = (w - cropW) / 2;
  const startY = h * 0.15; // 15% from the top matches the visual reading frame much better
  
  canvas.width = cropW;
  canvas.height = cropH;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(videoElement, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
  
  // Gentle Grayscale, removing the harsh black/white thresholding that ruins PC Monitors subpixels (moiré)
  const imageData = ctx.getImageData(0, 0, cropW, cropH);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Luminance grayscale
    let v = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Mild contrast increase
    const factor = (259 * (64 + 255)) / (255 * (259 - 64)); 
    v = factor * (v - 128) + 128;
    v = Math.max(0, Math.min(255, v));
    
    data[i] = data[i+1] = data[i+2] = v;
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
