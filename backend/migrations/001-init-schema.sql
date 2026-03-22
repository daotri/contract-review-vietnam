-- Initial schema: laws_raw, law_changelog, ai_config, law_chunks (pgvector)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS laws_raw (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_number      VARCHAR NOT NULL UNIQUE,
    law_name        VARCHAR NOT NULL,
    applies_to      TEXT[],
    priority        INTEGER,
    full_text       TEXT,
    articles        JSONB,
    source_url      VARCHAR,
    crawled_at      TIMESTAMPTZ,
    embedded        BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_laws_raw_law_number ON laws_raw(law_number);
CREATE INDEX IF NOT EXISTS idx_laws_raw_embedded ON laws_raw(embedded) WHERE embedded = FALSE;

CREATE TABLE IF NOT EXISTS law_changelog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    changed_at      TIMESTAMPTZ DEFAULT NOW(),
    law_number      VARCHAR,
    change_type     VARCHAR,
    article_id      VARCHAR,
    old_content     TEXT,
    new_content     TEXT,
    confirmed_by    VARCHAR
);

CREATE TABLE IF NOT EXISTS ai_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    llm_model       VARCHAR NOT NULL,
    llm_api_key     VARCHAR NOT NULL,
    llm_temperature FLOAT DEFAULT 0.1,
    updated_by      VARCHAR,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE
);

-- Ensure only one active config row
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_config_single_active ON ai_config(is_active) WHERE is_active = TRUE;

-- Insert default AI config (idempotent via unique partial index)
INSERT INTO ai_config (llm_model, llm_api_key, is_active)
VALUES ('claude-sonnet-4-6', '', TRUE)
ON CONFLICT (is_active) WHERE is_active = TRUE DO NOTHING;

-- Vector storage for Vietnamese law embeddings (replaces Qdrant)
CREATE TABLE IF NOT EXISTS law_chunks (
    id              SERIAL PRIMARY KEY,
    chunk_id        VARCHAR NOT NULL UNIQUE,
    law_number      VARCHAR NOT NULL,
    law_name        VARCHAR NOT NULL,
    article         VARCHAR,
    clause          VARCHAR,
    text            TEXT NOT NULL,
    applies_to      TEXT[],
    is_active       BOOLEAN DEFAULT TRUE,
    embedding       vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_law_chunks_law_number ON law_chunks(law_number);
CREATE INDEX IF NOT EXISTS idx_law_chunks_embedding ON law_chunks USING hnsw (embedding vector_cosine_ops);
