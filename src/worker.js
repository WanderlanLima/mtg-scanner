export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Endereço Blindado para buscar no Pinecone
    if (url.pathname === '/api/query' && request.method === 'POST') {
      try {
        const body = await request.json();
        const vector = body.vector;

        const PINECONE_HOST = env.VITE_PINECONE_HOST || "https://mtg-cards-stj5f7c.svc.aped-4627-b74a.pinecone.io";
        const PINECONE_API_KEY = env.VITE_PINECONE_API_KEY || "pcsk_5X4nPh_EobyadFd9sEFq4NBrecKBSzVA1YxhaKpVcT1AriGEW96rmCPgPBd5poNLMuh1hh";

        const res = await fetch(`${PINECONE_HOST}/query`, {
          method: "POST",
          headers: {
            "Api-Key": PINECONE_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            vector: vector,
            topK: 1,
            includeMetadata: true
          })
        });

        if (!res.ok) {
           const text = await res.text();
           return new Response(JSON.stringify({ error: text, status: res.status }), { status: res.status });
        }

        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Caso não seja a API, deixa o motor de estáticos do Cloudflare servir o React (dist)
    return env.ASSETS.fetch(request);
  }
};
