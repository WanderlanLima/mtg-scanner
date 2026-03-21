import { createClient } from '@supabase/supabase-js';
import { pipeline, env } from '@xenova/transformers';

import 'dotenv/config';

const SUPABASE_URL = 'https://nucbuxckedidwpsaenmz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Allow Node.js to download external model and process locally
env.allowLocalModels = false;

async function mineData() {
  console.log('🤖 Inicializando Robô de Mineração Hashing MTG...');
  
  console.log('📦 Baixando e aquecendo Modelo de IA Visual (Xenova/clip-vit-base-patch32) na CPU...');
  // Model specifically extracts 512 dimensions from an image
  const extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', { quantized: true });
  
  console.log('🗃️ Interrogando Scryfall Bulk Data...');
  const bulkRes = await fetch('https://api.scryfall.com/bulk-data/default-cards');
  const bulkData = await bulkRes.json();
  
  console.log(`📥 Baixando catálogo integral (${bulkData.download_uri})... Pode demorar alguns segundos/minutos o carregamento do JSON em memória.`);
  const cardsRes = await fetch(bulkData.download_uri);
  const cards = await cardsRes.json();
  
  console.log(`✅ ${cards.length} cartas lidas no JSON Mestre. Filtrando apenas as que possuem Artes Digitais...`);
  const validCards = cards.filter(c => c.image_uris && c.image_uris.normal);
  
  // PARA FINS DE DEMONSTRAÇÃO (POC): Iremos processar apenas as primeiras 15 cartas
  // Altere 'limit' para validCards.length para fuzilar o banco de dados inteiro (ATENÇÃO: Demora HORAS)
  const LIMIT = 15;
  console.log(`🚀 Iniciando o processamento Lote em Massa (Processando as primeiras ${LIMIT} cartas)...`);
  
  let successCount = 0;
  
  for (let i = 0; i < LIMIT; i++) {
    const card = validCards[i];
    console.log(`[${i+1}/${LIMIT}] Desmontando Cartão: ${card.name} (${card.set.toUpperCase()})`);
    
    try {
      // Extract Mathematical Vector Embedding directly from Scryfall CDN image string
      const output = await extractor(card.image_uris.normal);
      // Data is returned as a Float32Array Tensor. Convert to Array of 512 items
      const embedding = Array.from(output.data);
      
      // Upload via POST directly to Supabase Postgres (Requires proper schema existing)
      const { error } = await supabase
        .from('mtg_cards')
        .upsert({
          scryfall_id: card.id,
          oracle_id: card.oracle_id,
          name: card.name,
          lang: card.lang,
          set_code: card.set,
          collector_number: card.collector_number,
          image_url: card.image_uris.normal,
          image_embedding: embedding
        }, { onConflict: 'scryfall_id' });
        
      if (error) throw error;
      
      console.log(`   └─ ✅ 512 Vectors Injetados no Supabase DB!`);
      successCount++;
    } catch (e) {
      console.error(`   └─ ❌ Erro Crítico ao processar ${card.name}:`, e.message);
    }
  }
  
  console.log(`\n🎉 Robô Finalizado! ${successCount} cartas foram processadas e embutidas na nuvem comercial.`);
}

mineData();
