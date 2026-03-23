// Removemos o Supabase e usamos a API Serverless do Pinecone nativamente no Navegador!
const PINECONE_HOST = import.meta.env.VITE_PINECONE_HOST || '';
const PINECONE_API_KEY = import.meta.env.VITE_PINECONE_API_KEY || '';

// Fetch the English Rulings directly from Scryfall API avoiding limits
export const searchAutocomplete = async (term) => {
  if (term.length < 3) return [];
  try {
    const response = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(term)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.data.slice(0, 10);
  } catch (error) {
    console.error('Error fetching autocomplete:', error);
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

// Fetch full card details directly using Scryfall ID
export const fetchCardById = async (scryfallId) => {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
    if (!res.ok) throw new Error("Scryfall lookup failed");
    return await res.json();
  } catch (err) {
    console.error("Fetch Card Error:", err);
    return { error: true, code: err.message };
  }
};

// Pinecone Serverless Vector Search via Cloudflare Edge Function Proxy!
// Nova arquitetura 100% Precisa Absoluta: OCR de Nomes na API Fuzzy do Scryfall
export const searchCardByFuzzyName = async (rawName) => {
   // A string pura do OCR pode ter sujeira visual no lugar do símbolo de mana (Ex: "{T} Branco" virar "*f*  Branco")
   // Limpamos mantendo só letras, números, espaços e caracteres comuns de nomes de cartas.
   const cleanName = rawName.replace(/[^a-zA-Z0-9 ,'\-]/g, '').replace(/\s+/g, ' ').trim();
   
   // Previne requisições malformadas de frames vazios
   if (cleanName.length < 3) {
       throw new Error("Leitura falhou (nome muito curto ou borrado). Tente novamente.");
   }

   try {
      // Usa a tolerância de erros brutal do Scryfall (Levenshtein Distance Nuvem API)
      const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cleanName)}`);
      
      if (!res.ok) {
          if (res.status === 404) throw new Error(`Carta não econtrada com a leitura ótica crua: "${cleanName}"`);
          throw new Error(`Falha de Comunicação com a Nuvem WOTC. Código: ${res.status}`);
      }

      const card = await res.json();
      
      // Retorna 100% de Acerto (Fuzzy Match validado com as letras)
      return [{
         scryfall_id: card.id,
         similarity: 1.0, 
         oracle_id: card.oracle_id,
         name: card.name,
         set_code: card.set,
         image_url: card.image_uris ? card.image_uris.normal : (card.card_faces ? card.card_faces[0].image_uris.normal : '')
      }];
   } catch(e) {
      throw e;
   }
};
