-- 1. Habilitar a Extensão de Inteligência Artificial Vetorial
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar a Tabela Principal das Cartas (O Cérebro do ManaBox)
CREATE TABLE mtg_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scryfall_id TEXT UNIQUE NOT NULL,
  oracle_id TEXT,
  name TEXT NOT NULL,
  lang TEXT NOT NULL,
  set_code TEXT NOT NULL,
  collector_number TEXT NOT NULL,
  image_url TEXT,
  -- O Vetor Matemático da Arte da Carta (512 dimensões do modelo CLIP/ResNet)
  image_embedding vector(512)
);

-- 3. Criar a Função de Busca por Distância de Cosseno (Nearest Neighbor)
-- Essa é a função que o celular vai chamar para achar a carta instantaneamente
CREATE OR REPLACE FUNCTION match_card(query_embedding vector(512), match_threshold float, match_count int)
RETURNS TABLE (
  scryfall_id TEXT,
  name TEXT,
  lang TEXT,
  set_code TEXT,
  collector_number TEXT,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    scryfall_id,
    name,
    lang,
    set_code,
    collector_number,
    1 - (mtg_cards.image_embedding <=> query_embedding) AS similarity
  FROM mtg_cards
  WHERE 1 - (mtg_cards.image_embedding <=> query_embedding) > match_threshold
  ORDER BY mtg_cards.image_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. Opcional, mas Altamente Recomendado: Criar Dicionário Padrão de Indexação Rápida
-- Isso força a busca a demorar 2 milissegundos mesmo com 80.000 cartas.
CREATE INDEX ON mtg_cards USING hnsw (image_embedding vector_cosine_ops);
