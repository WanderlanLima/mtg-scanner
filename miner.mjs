import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline, env } from '@xenova/transformers';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';

// Initialize Pinecone Client
const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pc.index('mtg-cards');

// Allow Node.js to download external model and process locally
env.allowLocalModels = false;

async function mineData() {
  console.log('🤖 Inicializando Robô de Mineração Hashing MTG Serverless (PINECONE)...');
  
  if (!PINECONE_API_KEY) {
     console.error("❌ ERRO: PINECONE_API_KEY não encontrada no .env.local!");
     return;
  }

  console.log('📦 Baixando e aquecendo Modelo de IA Visual (Xenova/clip-vit-base-patch32) na CPU...');
  const extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', { quantized: true });
  
  console.log('🗃️ Interrogando Scryfall Bulk Data...');
  const bulkRes = await fetch('https://api.scryfall.com/bulk-data/default-cards');
  const bulkData = await bulkRes.json();
  
  console.log(`📥 Baixando catálogo integral... Pode demorar alguns segundos/minutos.`);
  const cardsRes = await fetch(bulkData.download_uri);
  const cards = await cardsRes.json();
  
  const validCards = cards.filter(c => c.image_uris && c.image_uris.normal);
  
  // Limite foi removido. Processando o catálogo integral!
  const LIMIT = validCards.length;
  console.log(`🚀 Preparando Lote de ${LIMIT} cartas...`);
  
  console.log('🔍 Consultando Pinecone para executar Delta Sync...');
  const existingIds = new Set();
  try {
     let next = undefined;
     do {
       // listPaginated retrieves all IDs without blowing up memory
       const res = await index.listPaginated({ paginationToken: next });
       if (res.vectors) res.vectors.forEach(v => existingIds.add(v.id));
       next = res.pagination?.next;
     } while (next);
     console.log(`⚡ ${existingIds.size} cartas identificadas na Nuvem Pinecone! Aceleração ativada.`);
  } catch(e) { 
     console.log("⚡ Aviso Pinecone: Banco Vazio ou recém-criado (Ignorando Pulos)."); 
  }
  
  let successCount = 0;
  let batch = [];
  
  for (let i = 0; i < LIMIT; i++) {
    const card = validCards[i];
    
    // DELTA SYNC PINECONE: Pular Rápido
    if (existingIds.has(card.id)) continue;

    console.log(`[${i+1}/${LIMIT}] Desmontando NOVA Carta: ${card.name} (${card.set.toUpperCase()})`);
    
    try {
      // CIRURGIA: Analisa apenas a "Arte" da carta (ignora os textos e bordas, que confundem a IA)
      const output = await extractor(card.image_uris.art_crop);
      const embedding = Array.from(output.data);
      
      batch.push({
          id: card.id,
          values: embedding,
          metadata: {
             oracle_id: card.oracle_id || '',
             name: card.name || '',
             lang: card.lang || '',
             set_code: card.set || '',
             collector_number: card.collector_number || '',
             image_url: card.image_uris.normal || ''
          }
      });
      
      // Upsert: Pinecone Serverless aguenta o tráfego pesado brutalmente rápido
      if (batch.length >= 100) {
        await index.upsert({ records: batch });
        console.log(`   └─ ✅ LOTE COMPLETO: 100 Cartões Injetados de uma vez no Pinecone DB!`);
        successCount += batch.length;
        batch = []; 
      }
    } catch (e) {
      console.error(`   └─ ❌ Erro Crítico ao processar ${card.name}:`, e.message);
      // Se estourar a memória ou dar erro no index, limpa a caixa pra não quebrar as próximas cartas!
      if (batch.length >= 100) batch = [];
    }
  }
  
  if (batch.length > 0) {
     await index.upsert({ records: batch });
     console.log(`   └─ ✅ LOTE FINAL: ${batch.length} Cartões Injetados Serverless!`);
     successCount += batch.length;
  }
  
  console.log(`\n🎉 Robô Finalizado! A Nuvem Infinta do Pinecone está abastecida.`);
}

mineData();
