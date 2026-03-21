import { createClient } from '@supabase/supabase-js';

// Usamos Variaveis de Ambiente do Vite para esconder a chave!
const SUPABASE_URL = 'https://nucbuxckedidwpsaenmz.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'CHAVE_FALTANDO_NO_ENV_LOCAL_ADICIONAR_PARA_FUNCIONAR';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const searchAutocomplete = async (term) => {
  if (!term || term.trim().length === 0) return [];
  try {
    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(term)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data; // array of string names
  } catch (error) {
    console.error("Scryfall autocomplete error:", error);
    return [];
  }
};

export const fetchCardByName = async (name) => {
  try {
    const safeName = name.replace(/"/g, '');
    const query = `lang:any "${safeName}"`;
    const searchUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;
    
    const res = await fetch(searchUrl);
    if (!res.ok) {
      const fuzzyRes = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
      if (fuzzyRes.ok) return await fuzzyRes.json();
      return null;
    }
    const data = await res.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error("Scryfall search error:", error);
    return null;
  }
};

export const translateText = async (text, targetLang = 'pt') => {
  if (!text) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(s => s[0]).join('');
    }
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

export const fetchCardRulings = async (rulingsUri) => {
  if (!rulingsUri) return [];
  try {
    const res = await fetch(rulingsUri);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Scryfall rulings fetch error:", error);
    return [];
  }
};

export const fetchCardById = async (id) => {
  try {
    const response = await fetch(`https://api.scryfall.com/cards/${id}`);
    if (!response.ok) return { error: "Carta não encontrada." };
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Scryfall API Error:", error);
    return { error: "Erro de conexão com o banco de dados." };
  }
};

export const matchCardByEmbedding = async (embeddingArray) => {
  try {
    const { data, error } = await supabase.rpc('match_card', {
      query_embedding: embeddingArray,
      match_threshold: 0.70, // Rebaixado de 0.85 para tolerar Moiré e Distorção Câmera
      match_count: 1
    });

    if (error) throw error;
    if (data && data.length > 0) {
       return data[0]; 
    }
    return null;
  } catch (err) {
    console.error("Supabase pgvector match error:", err);
    return null;
  }
};
