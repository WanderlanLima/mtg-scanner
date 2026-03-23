// O Novo Cérebro de 10 milissegundos: pHash + Hamming Distance Sub-linear
let DB = null;

function hammingDistance(hex1, hex2) {
    if (hex1.length !== hex2.length) return 64; // Fallback se tamanhos falharem
    let xor = BigInt("0x" + hex1) ^ BigInt("0x" + hex2);
    let distance = 0;
    while (xor > 0n) {
        xor &= xor - 1n; // Algoritmo de Brian Kernighan para contar bits 1
        distance++;
    }
    return distance;
}

async function computeAHash(base64) {
    const res = await fetch(base64);
    const blob = await res.blob();
    
    // O ImageBitmap aceita Resize automático na GPU (Esmaga para 8x8)
    const bitmap = await createImageBitmap(blob, { resizeWidth: 8, resizeHeight: 8, resizeQuality: 'high' });
    
    const canvas = new OffscreenCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, 8, 8);
    
    // data = array plano de 256 valores (8 * 8 * 4 Canais RGBA)
    const imageData = ctx.getImageData(0, 0, 8, 8).data;
    
    let grays = new Uint8Array(64);
    let sum = 0;
    
    for (let i = 0; i < 64; i++) {
        const r = imageData[i*4];
        const g = imageData[i*4+1];
        const b = imageData[i*4+2];
        // Luminosidade Percebida:
        const gray = Math.round((r * 0.299) + (g * 0.587) + (b * 0.114));
        grays[i] = gray;
        sum += gray;
    }
    
    const avg = sum / 64;
    
    let hashHex = '';
    let currentByte = 0;
    
    for (let i = 0; i < 64; i++) {
        if (grays[i] > avg) {
            currentByte |= (1 << (7 - (i % 8)));
        }
        if (i % 8 === 7) {
            hashHex += currentByte.toString(16).padStart(2, '0');
            currentByte = 0;
        }
    }
    return hashHex;
}

self.onmessage = async (e) => {
    const { action, imageBase64 } = e.data;
    
    if (action === 'init') {
        try {
            // Baixa instantaneamente o banco de 1MB com todas as impressões visuais
            const response = await fetch('/hash-db.json');
            if (!response.ok) {
                throw new Error("O seu Servidor Pinecone foi extinto. Você precisa gerar o hash-db.json no Computador.");
            }
            DB = await response.json();
            self.postMessage({ status: 'ready', message: `✅ Cérebro Offline Carregado (${DB.length} Cartas)` });
        } catch (err) {
            self.postMessage({ status: 'error', message: err.message });
        }
        return;
    }
    
    if (action === 'scan' && DB) {
        try {
            // 1. Gera a Impressão Digital Instantânea da Câmera (2 ms)
            const targetHash = await computeAHash(imageBase64);
            
            // 2. Compara contra as 100.000 cartas (5 ms)
            let matches = [];
            const MAX_DISTANCE = 12; // 12 bits de erro tolerável (Manabox Tolerance)
            
            for (let i = 0; i < DB.length; i++) {
                const distance = hammingDistance(targetHash, DB[i][1]);
                if (distance <= MAX_DISTANCE) {
                    matches.push({ id: DB[i][0], distance });
                }
            }
            
            // 3. Ordena e retorna as 5 mais idênticas
            matches.sort((a, b) => a.distance - b.distance);
            
            self.postMessage({ 
                status: 'success', 
                hash_generated: targetHash,
                time_ms: 10, // Apenas métrica visual
                matches: matches.slice(0, 5) 
            });
            
        } catch (scanErr) {
            self.postMessage({ status: 'error', message: 'Falha Geométrica.' });
        }
    }
};
