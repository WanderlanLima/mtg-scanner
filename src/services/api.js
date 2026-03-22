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
export const matchCardByEmbedding = async (embeddingArray) => {
  try {
    // Chamada blindada pro nosso próprio servidor Cloudflare, evitando bloqueio de CORS do Navegador 
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: embeddingArray
      })
    });

    if (!res.ok) {
       const alertErr = await res.text();
       throw new Error(`Cloudflare Edge Server Error: ${alertErr}`);
    }
    
    const json = await res.json();
    
    if (json.matches && json.matches.length > 0) {
      const match = json.matches[0];
      // Indexação Cosine Similarity: 0.70 significa 70% de certeza e igualdade matemática visual!
      if (match.score >= 0.70) {
        return {
          scryfall_id: match.id,
          similarity: match.score,
          oracle_id: match.metadata.oracle_id,
          name: match.metadata.name,
          set_code: match.metadata.set_code,
          image_url: match.metadata.image_url
        };
      }
    }
    return null;

  } catch (err) {
    console.error('Pinecone Math Engine Error:', err);
    throw err;
  }
};
