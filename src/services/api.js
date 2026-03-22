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

export const fetchCardDetails = async (cardName) => {
  try {
    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
    if (!response.ok) throw new Error('Card not found');
    return await response.json();
  } catch (error) {
    console.error('Error fetching card details:', error);
    return null;
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

// Pinecone Serverless Vector Search
export const matchCardByEmbedding = async (embeddingArray) => {
  try {
    // Validação PWA: Se não houver configuração, nem enviamos a foto pro lixo
    if (!PINECONE_HOST || !PINECONE_API_KEY) {
      console.warn("Chaves Pinecone ausentes no .env.local!");
      return null;
    }

    const res = await fetch(`${PINECONE_HOST}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: embeddingArray,
        topK: 1, // Retorna apenas a carta com maior grau de certeza
        includeMetadata: true // Baixa os dados da carta anexados ao bloco matemático
      })
    });

    if (!res.ok) {
       const alertErr = await res.text();
       throw new Error(`Pinecone Server Error: ${alertErr}`);
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
