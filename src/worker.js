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
            topK: 10,
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

    // Rota de Proxy Imparável para o HuggingFace (Bypass Brave Shields e CORS)
    if (url.pathname.startsWith('/api/hfproxy/')) {
      const targetUrl = 'https://huggingface.co/' + url.pathname.replace('/api/hfproxy/', '');
      
      const reqHeaders = new Headers(request.headers);
      reqHeaders.delete("origin");
      reqHeaders.delete("referer");

      try {
        const response = await fetch(targetUrl, { 
          method: request.method, 
          headers: reqHeaders 
        });
        
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        return newResponse;
      } catch(err) {
        return new Response(err.message, { status: 500 });
      }
    }

    // Roteador Manual de Assets e Fallback do React (SPA)
    // Buscamos o arquivo físico no repositório (ex: imagens, scripts do vite)
    let response = await env.ASSETS.fetch(request);
    
    // Se o arquivo físico não existir (ex: navegou direto para /scan na barra de URL),
    // o React precisa assumir. Devolvemos forçadamente o index.html principal!
    if (response.status === 404) {
      const indexUrl = new URL('/', request.url);
      response = await env.ASSETS.fetch(new Request(indexUrl, request));
    }
    
    return response;
  }
};
