export function processImageForOCR(videoElement) {
  const canvas = document.createElement('canvas');
  // Crop top 20% of the video standard
  const width = videoElement.videoWidth;
  const height = videoElement.videoHeight * 0.2; // top 20%
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // Draw only the top 20% of the video to the canvas
  ctx.drawImage(videoElement, 0, 0, width, height, 0, 0, width, height);
  
  // Grayscale and Contrast Filter
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Grayscale
    let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // Contrast
    const factor = (259 * (128 + 255)) / (255 * (259 - 128));
    v = factor * (v - 128) + 128;
    
    // Threshold to black/white
    v = v > 120 ? 255 : 0;
    
    data[i] = data[i+1] = data[i+2] = v;
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
