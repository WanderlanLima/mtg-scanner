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
export const hydratePhashMatches = async (hashMatches) => {
  if (!hashMatches || hashMatches.length === 0) return null;

  try {
    // Para buscar várias cartas no Scryfall em 1 request:
    // POST https://api.scryfall.com/cards/collection
    const identifiers = hashMatches.map(m => ({ id: m.id }));
    
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers })
    });

    if (!res.ok) {
       console.error("Scryfall Hydration failed:", res.status);
       throw new Error("Falha ao baixar dados das cartas Gêmeas no Scryfall.");
    }

    const json = await res.json();
    
    if (json.data && json.data.length > 0) {
       return json.data.map(card => {
          // O Scryfall retorna a lista, mas perdemos a "distância" do pHash.
          // Vamos re-ancorar a Distância de Hamming buscando qual match gerou esse card.
          const originalMatch = hashMatches.find(m => m.id === card.id);
          const distance = originalMatch ? originalMatch.distance : 0;
          // Se a distância for 0, é 100%. Se for 12, é ~81%.
          const score = Math.max(0, 100 - (distance * 1.56)); // 1.56 * 64 bits = ~100

          return {
             scryfall_id: card.id,
             similarity: score / 100, 
             oracle_id: card.oracle_id,
             name: card.name,
             set_code: card.set,
             image_url: card.image_uris ? card.image_uris.normal : (card.card_faces ? card.card_faces[0].image_uris.normal : '')
          };
       });
    }
    
    return null;
  } catch (err) {
    console.error("Hydration Error:", err);
    throw err;
  }
};
