import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';

const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pc.index('mtg-cards');

async function clearDB() {
  console.log("🧹 Iniciando apagão total do Pinecone para aplicar novo modelo de Precisão Cirúrgica (Apenas Arte)...");
  try {
     await index.deleteAll();
     console.log("✅ Banco de Dados Pinecone zerado com sucesso! Você pode iniciar o miner.mjs agora.");
  } catch(e) {
     console.error("❌ Erro ao apagar:", e);
  }
}
clearDB();
