import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import fetch from 'node-fetch';

const HASH_DB_PATH = path.join(process.cwd(), 'public', 'hash-db.json');
const PROGRESS_FILE = path.join(process.cwd(), 'miner-progress.json');
const CHUNK_SIZE = 10; // Scryfall pede max 10 requests por segundo

// Gera Perceptual Hash (aHash) de uma imagem em Buffer
async function generatePhash(imageBuffer) {
  try {
    const { data } = await sharp(imageBuffer)
      .resize(8, 8, { fit: 'fill' }) // Força proporção 8x8 esmagando a imagem
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let total = 0;
    for (let i = 0; i < 64; i++) {
        total += data[i];
    }
    const avg = total / 64;

    let hashHex = '';
    let currentByte = 0;
    
    for (let i = 0; i < 64; i++) {
        if (data[i] > avg) {
            currentByte |= (1 << (7 - (i % 8)));
        }
        if (i % 8 === 7) {
            hashHex += currentByte.toString(16).padStart(2, '0');
            currentByte = 0;
        }
    }
    return hashHex;
  } catch (err) {
    return null;
  }
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log('🔮 Bem-vindo ao pHash Miner 1.0');
  console.log('Baixando catálogo global do Scryfall...');

  const bulkMeta = await fetch('https://api.scryfall.com/bulk-data/default-cards').then(r => r.json());
  console.log('Baixando JSON dos cards (pode demorar alguns segundos)...\n');
  const cardsData = await fetch(bulkMeta.download_uri).then(r => r.json());

  // Filtra cartas físicas injogáveis e cartas sem arte
  const rawValid = cardsData.filter(c => 
     c.image_uris && 
     c.image_uris.art_crop && 
     c.layout !== 'art_series' && 
     c.layout !== 'token' &&
     c.illustration_id // Garante que a carta tem um ID de Pintura único
  );

  // Desduplicação Brutal: SÓ BAIXA a imagem se a Ilustração for inédita!
  // Cartas com a mesma arte exata (Reprints) não precisam ser recalculadas e dividem o mesmo pHash.
  const uniqueArtsMap = new Map();
  for (const card of rawValid) {
      if (!uniqueArtsMap.has(card.illustration_id)) {
          uniqueArtsMap.set(card.illustration_id, card);
      } else {
          // Já existe uma carta com essa exata mesma pintura.
          // Em vez de baixar de novo, poderíamos guardar os IDs adicionais para o frontend cruzar,
          // Mas como o app vai consultar a Scryfall API pelo nome depois, uma versão já agrupa todas.
      }
  }

  const validCards = Array.from(uniqueArtsMap.values());
  console.log(`✅ Total de Pinturas Únicas para Extração (Corte de Reprints!): ${validCards.length} de ${rawValid.length} cartas globais.`);

  let hashedDatabase = [];
  let startIndex = 0;

  if (fs.existsSync(HASH_DB_PATH)) {
     hashedDatabase = JSON.parse(fs.readFileSync(HASH_DB_PATH, 'utf-8'));
     console.log(`📦 Encontrado banco anterior com ${hashedDatabase.length} cartas.`);
  }

  if (fs.existsSync(PROGRESS_FILE)) {
     const savedProgress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
     startIndex = savedProgress.lastIndex || 0;
     console.log(`⏳ Resumindo a partir da carta estrutural: ${startIndex} de ${validCards.length}`);
  }

  // Tira o atraso para não esmagar a API de cara
  await delay(1000);

  // Processamento Massivo Concorrente (10 por lote)
  for (let i = startIndex; i < validCards.length; i += CHUNK_SIZE) {
      const chunk = validCards.slice(i, i + CHUNK_SIZE);
      const startTime = Date.now();

      const promises = chunk.map(async (card) => {
         try {
             // Checa se já existe por algum motivo (reuso do DB)
             if (hashedDatabase.find(x => x[0] === card.id)) return null;

             const imgRes = await fetch(card.image_uris.art_crop);
             if (!imgRes.ok) return null;
             const buffer = await imgRes.arrayBuffer();
             const hash = await generatePhash(Buffer.from(buffer));
             
             if (hash) {
                // Estrutura Super-OTIMIZADA pro Frontend PWA não travar o celular e pesar < 3MB
                // Array Numérico: [ id_scryfall, hash_64 ]
                return [card.id, hash]; 
             }
         } catch(e) {
             console.error(`Erro ao processar ${card.name}: ${e.message}`);
         }
         return null;
      });

      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);
      
      if (validResults.length > 0) {
          hashedDatabase.push(...validResults);
      }

      // Salva progresso físico a cada lote
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastIndex: i + CHUNK_SIZE }));
      
      // Salva o JSON final no meio do processo a cada 500 cartas
      if (i % 500 === 0) {
         fs.writeFileSync(HASH_DB_PATH, JSON.stringify(hashedDatabase));
         console.log(`💾 Base sincronizada em disco. Progresso Geral: ${i}/${validCards.length} (${((i/validCards.length)*100).toFixed(2)}%)`);
      }

      const elapsed = Date.now() - startTime;
      const rateLimitTime = 1000; // Scryfall exige 1 segundo de folga entre os requests
      if (elapsed < rateLimitTime) {
         await delay(rateLimitTime - elapsed);
      }
      
      process.stdout.write(`\r⚙️ Lote OK: [${i + CHUNK_SIZE} / ${validCards.length}] Extraindo Impressão Digital Matemática...`);
  }

  console.log('\n\n🚀 Extração Completa! Escrevendo Banco Definitivo...');
  fs.writeFileSync(HASH_DB_PATH, JSON.stringify(hashedDatabase));
  fs.unlinkSync(PROGRESS_FILE);
  console.log(`✅ Sucesso! public/hash-db.json gerado com ${hashedDatabase.length} assinaturas biológicas.`);
}

run().catch(console.error);
