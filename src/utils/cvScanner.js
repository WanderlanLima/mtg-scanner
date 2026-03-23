let edgeCanvas = null;

export function findCardContour(videoElement) {
  if (!window.cv || typeof window.cv.Mat !== 'function') return null;

  try {
    const MAX_DIM = 640;
    let w = videoElement.videoWidth;
    let h = videoElement.videoHeight;
    let scale = 1.0;
    
    if (w > MAX_DIM || h > MAX_DIM) {
      scale = Math.min(MAX_DIM / w, MAX_DIM / h);
    }
    
    const procW = Math.round(w * scale);
    const procH = Math.round(h * scale);
    
    if (!edgeCanvas) {
       edgeCanvas = document.createElement('canvas');
    }
    edgeCanvas.width = procW;
    edgeCanvas.height = procH;
    
    const src = new window.cv.Mat(procH, procW, window.cv.CV_8UC4);
    const canvasCtx = edgeCanvas.getContext('2d', { willReadFrequently: true });
    canvasCtx.drawImage(videoElement, 0, 0, procW, procH);
    const imageData = canvasCtx.getImageData(0, 0, procW, procH);
    src.data.set(imageData.data);

    const gray = new window.cv.Mat();
    window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

    const blurred = new window.cv.Mat();
    window.cv.GaussianBlur(gray, blurred, new window.cv.Size(11, 11), 0, 0, window.cv.BORDER_DEFAULT);

    const edges = new window.cv.Mat();
    window.cv.Canny(blurred, edges, 40, 150, 3, false);

    const contours = new window.cv.MatVector();
    const hierarchy = new window.cv.Mat();
    window.cv.findContours(edges, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let bestPoly = null;
    const minCardArea = (procW * procH) * 0.1; // minimum 10% of screen area

    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = window.cv.contourArea(cnt);
      if (area > minCardArea) {
        const peri = window.cv.arcLength(cnt, true);
        const approx = new window.cv.Mat();
        window.cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
        
        if (approx.rows === 4 && area > maxArea) {
          maxArea = area;
          if (bestPoly) bestPoly.delete();
          bestPoly = approx;
        } else {
          approx.delete();
        }
      }
      cnt.delete();
    }

    src.delete(); gray.delete(); blurred.delete(); edges.delete(); contours.delete(); hierarchy.delete();

    if (bestPoly) {
      const points = [];
      const data32S = bestPoly.data32S;
      for (let i = 0; i < 4; i++) {
        points.push({ 
          x: Math.round(data32S[i * 2] / scale), 
          y: Math.round(data32S[i * 2 + 1] / scale) 
        });
      }
      bestPoly.delete();
      return points;
    }
    return null;
  } catch (err) {
    console.error('OpenCV processing error:', err);
    return null;
  }
}

function orderPoints(pts) {
  // Sort points to: top-left, top-right, bottom-right, bottom-left
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const left = [sorted[0], sorted[1]].sort((a, b) => a.y - b.y);
  const tl = left[0], bl = left[1];

  const right = [sorted[2], sorted[3]].sort((a, b) => a.y - b.y);
  const tr = right[0], br = right[1];
  
  return [tl, tr, br, bl];
}

export function warpCardPerspective(videoElement, canvasObj, points) {
  if (!window.cv || !points || points.length !== 4) return null;

  try {
    const src = new window.cv.Mat(videoElement.videoHeight, videoElement.videoWidth, window.cv.CV_8UC4);
    const canvasCtx = canvasObj.getContext('2d', { willReadFrequently: true });
    canvasCtx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
    const imageData = canvasCtx.getImageData(0, 0, videoElement.videoWidth, videoElement.videoHeight);
    src.data.set(imageData.data);

    const ordered = orderPoints(points);
    const srcTri = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
      ordered[0].x, ordered[0].y,
      ordered[1].x, ordered[1].y,
      ordered[2].x, ordered[2].y,
      ordered[3].x, ordered[3].y
    ]);

    // Standard MTG card ratio 63x88 -> Output frame 400x560
    const w = 400, h = 560;
    const dstTri = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
      0, 0, w, 0, w, h, 0, h
    ]);

    const M = window.cv.getPerspectiveTransform(srcTri, dstTri);
    const dst = new window.cv.Mat();
    const dsize = new window.cv.Size(w, h);
    window.cv.warpPerspective(src, dst, M, dsize, window.cv.INTER_LINEAR, window.cv.BORDER_CONSTANT, new window.cv.Scalar());

    // For Neural Network Embeddings, we isolate ONLY the physical Artwork!
    // MTG Art box is roughly from Y=44px to Y=308px on a 400x560 frame.
    const artHeight = 264;
    const artRect = new window.cv.Rect(0, 44, w, artHeight);
    const croppedArt = dst.roi(artRect);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w; outCanvas.height = artHeight;
    window.cv.imshow(outCanvas, croppedArt);

    // Cleanup memory to prevent WASM leaks
    src.delete(); srcTri.delete(); dstTri.delete(); M.delete(); dst.delete(); croppedArt.delete();

    // Return the sharply cropped artwork frame 
    return outCanvas.toDataURL('image/png');
  } catch (err) {
    console.error('Warp error:', err);
    return null;
  }
}
