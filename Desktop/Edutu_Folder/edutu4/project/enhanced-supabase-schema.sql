-- Enhanced Supabase Vector Database Schema for Advanced RAG
-- Edutu AI Chat System - Production Ready

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Advanced Chat History Embeddings Table
CREATE TABLE IF NOT EXISTS chat_history_embeddings (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL UNIQUE,
    message_text TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('user', 'assistant')) NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    message_intent TEXT, -- classified intent: scholarship, roadmap, career, etc.
    context_entities TEXT[], -- extracted entities from message
    sentiment_score REAL DEFAULT 0, -- message sentiment (-1 to 1)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Scholarship Embeddings (existing table upgrade)
ALTER TABLE scholarships_embeddings ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE scholarships_embeddings ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE scholarships_embeddings ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE scholarships_embeddings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- New Roadmap Embeddings Table
CREATE TABLE IF NOT EXISTS roadmap_embeddings (
    id BIGSERIAL PRIMARY KEY,
    roadmap_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    phase_content TEXT NOT NULL, -- concatenated phase content
    skills_involved TEXT[] NOT NULL,
    difficulty_level TEXT NOT NULL,
    estimated_duration TEXT NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    content_hash TEXT NOT NULL,
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Context Embeddings (enhanced preferences)
CREATE TABLE IF NOT EXISTS user_context_embeddings (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    profile_embedding VECTOR(1536) NOT NULL, -- user profile + preferences
    activity_embedding VECTOR(1536), -- recent activity patterns
    goal_embedding VECTOR(1536), -- user goals and aspirations
    interaction_history TEXT[], -- key interaction patterns
    learning_style TEXT NOT NULL,
    career_stage TEXT NOT NULL,
    skill_level TEXT NOT NULL,
    context_metadata JSONB DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation Sessions for Long-term Memory
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    session_title TEXT, -- AI-generated session summary
    session_embedding VECTOR(1536), -- session summary embedding
    message_count INTEGER DEFAULT 0,
    key_topics TEXT[], -- main topics discussed
    session_summary TEXT, -- AI-generated summary
    sentiment_trend REAL DEFAULT 0, -- overall session sentiment
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Semantic Knowledge Graph for Context
CREATE TABLE IF NOT EXISTS knowledge_entities (
    id BIGSERIAL PRIMARY KEY,
    entity_id TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL, -- scholarship, skill, career, university, etc.
    entity_name TEXT NOT NULL,
    entity_description TEXT,
    entity_embedding VECTOR(1536) NOT NULL,
    related_entities TEXT[], -- related entity IDs
    popularity_score REAL DEFAULT 0, -- how often referenced
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session ON chat_history_embeddings(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history_embeddings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_intent ON chat_history_embeddings(message_intent);

-- Vector similarity indexes using HNSW for better performance
CREATE INDEX IF NOT EXISTS idx_chat_history_embedding_hnsw ON chat_history_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_roadmap_embedding_hnsw ON roadmap_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_user_context_profile_hnsw ON user_context_embeddings 
USING hnsw (profile_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_user_context_activity_hnsw ON user_context_embeddings 
USING hnsw (activity_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_hnsw ON knowledge_entities 
USING hnsw (entity_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Row Level Security (RLS) Policies
ALTER TABLE chat_history_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_context_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entities ENABLE ROW LEVEL SECURITY;

-- Policies for chat history
CREATE POLICY "Users can view own chat history" 
ON chat_history_embeddings FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access to chat history" 
ON chat_history_embeddings FOR ALL 
USING (auth.role() = 'service_role');

-- Policies for user context
CREATE POLICY "Users can view own context" 
ON user_context_embeddings FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access to user context" 
ON user_context_embeddings FOR ALL 
USING (auth.role() = 'service_role');

-- Policies for conversation sessions
CREATE POLICY "Users can view own sessions" 
ON conversation_sessions FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access to sessions" 
ON conversation_sessions FOR ALL 
USING (auth.role() = 'service_role');

-- Policies for knowledge entities (read-only for users)
CREATE POLICY "Users can view knowledge entities" 
ON knowledge_entities FOR SELECT 
USING (true);

CREATE POLICY "Service role full access to knowledge entities" 
ON knowledge_entities FOR ALL 
USING (auth.role() = 'service_role');

-- Advanced RAG Functions

-- 1. Hybrid Search: Semantic + Context + Recency
CREATE OR REPLACE FUNCTION match_contextual_scholarships(
    query_embedding VECTOR(1536),
    user_id_param TEXT,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    recency_boost FLOAT DEFAULT 0.1
)
RETURNS TABLE (
    scholarship_id TEXT,
    title TEXT,
    summary TEXT,
    category TEXT,
    provider TEXT,
    similarity FLOAT,
    context_score FLOAT,
    final_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH user_context AS (
        SELECT profile_embedding, activity_embedding, goal_embedding
        FROM user_context_embeddings 
        WHERE user_context_embeddings.user_id = user_id_param
    ),
    scholarship_matches AS (
        SELECT 
            s.scholarship_id,
            s.title,
            s.summary,
            s.category,
            s.provider,
            -- Semantic similarity
            1 - (s.embedding <=> query_embedding) AS semantic_similarity,
            -- Context similarity (profile + goals)
            CASE 
                WHEN u.profile_embedding IS NOT NULL THEN
                    1 - (s.embedding <=> u.profile_embedding) * 0.6 +
                    CASE WHEN u.goal_embedding IS NOT NULL THEN
                        1 - (s.embedding <=> u.goal_embedding) * 0.4
                    ELSE 0 END
                ELSE 0
            END AS context_similarity,
            -- Recency boost
            EXTRACT(EPOCH FROM (NOW() - s.last_updated)) / 86400.0 AS days_since_update
        FROM scholarships_embeddings s
        CROSS JOIN user_context u
        WHERE 1 - (s.embedding <=> query_embedding) > match_threshold
    )
    SELECT 
        sm.scholarship_id,
        sm.title,
        sm.summary,
        sm.category,
        sm.provider,
        sm.semantic_similarity AS similarity,
        sm.context_similarity AS context_score,
        -- Weighted final score
        (sm.semantic_similarity * 0.4 + 
         sm.context_similarity * 0.4 + 
         (1.0 / (1.0 + sm.days_since_update * recency_boost)) * 0.2) AS final_score
    FROM scholarship_matches sm
    ORDER BY final_score DESC
    LIMIT match_count;
END;
$$;

-- 2. Conversation Context Retrieval
CREATE OR REPLACE FUNCTION get_conversation_context(
    user_id_param TEXT,
    session_id_param TEXT DEFAULT NULL,
    context_limit INT DEFAULT 20,
    similarity_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE (
    message_id TEXT,
    message_text TEXT,
    message_type TEXT,
    message_intent TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    relevance_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.message_id,
        ch.message_text,
        ch.message_type,
        ch.message_intent,
        ch.created_at,
        -- Recency + Session relevance scoring
        CASE 
            WHEN session_id_param IS NOT NULL AND ch.session_id = session_id_param THEN 1.0
            ELSE 0.8 - (EXTRACT(EPOCH FROM (NOW() - ch.created_at)) / 86400.0 * 0.1)
        END AS relevance_score
    FROM chat_history_embeddings ch
    WHERE ch.user_id = user_id_param
        AND (session_id_param IS NULL OR ch.session_id = session_id_param)
    ORDER BY 
        CASE WHEN session_id_param IS NOT NULL AND ch.session_id = session_id_param THEN 0 ELSE 1 END,
        ch.created_at DESC
    LIMIT context_limit;
END;
$$;

-- 3. Smart Roadmap Matching
CREATE OR REPLACE FUNCTION match_relevant_roadmaps(
    query_embedding VECTOR(1536),
    user_skills TEXT[] DEFAULT '{}',
    difficulty_preference TEXT DEFAULT 'any',
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    roadmap_id TEXT,
    title TEXT,
    description TEXT,
    skills_involved TEXT[],
    difficulty_level TEXT,
    estimated_duration TEXT,
    similarity FLOAT,
    skill_match_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.roadmap_id,
        r.title,
        r.description,
        r.skills_involved,
        r.difficulty_level,
        r.estimated_duration,
        1 - (r.embedding <=> query_embedding) AS similarity,
        -- Skill overlap score
        CASE 
            WHEN array_length(user_skills, 1) > 0 THEN
                (array_length(array(SELECT unnest(r.skills_involved) INTERSECT SELECT unnest(user_skills)), 1) * 1.0) 
                / GREATEST(array_length(r.skills_involved, 1), 1)
            ELSE 0
        END AS skill_match_score
    FROM roadmap_embeddings r
    WHERE 1 - (r.embedding <=> query_embedding) > match_threshold
        AND (difficulty_preference = 'any' OR r.difficulty_level = difficulty_preference)
    ORDER BY 
        (1 - (r.embedding <=> query_embedding)) * 0.7 + 
        CASE 
            WHEN array_length(user_skills, 1) > 0 THEN
                (array_length(array(SELECT unnest(r.skills_involved) INTERSECT SELECT unnest(user_skills)), 1) * 1.0) 
                / GREATEST(array_length(r.skills_involved, 1), 1) * 0.3
            ELSE 0
        END DESC
    LIMIT match_count;
END;
$$;

-- 4. Session Summary Generation Data
CREATE OR REPLACE FUNCTION update_session_summary(
    session_id_param TEXT,
    summary_text TEXT,
    key_topics_param TEXT[],
    sentiment_score FLOAT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE conversation_sessions 
    SET 
        session_summary = summary_text,
        key_topics = key_topics_param,
        sentiment_trend = sentiment_score,
        updated_at = NOW()
    WHERE session_id = session_id_param;
END;
$$;

-- Performance monitoring views
CREATE OR REPLACE VIEW rag_performance_stats AS
SELECT 
    'chat_history_embeddings' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0) as avg_age_days
FROM chat_history_embeddings
UNION ALL
SELECT 
    'conversation_sessions' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(message_count) as avg_messages_per_session
FROM conversation_sessions
UNION ALL
SELECT 
    'user_context_embeddings' as table_name,
    COUNT(*) as total_records,
    COUNT(*) as unique_users,
    AVG(EXTRACT(EPOCH FROM (NOW() - last_activity)) / 86400.0) as avg_days_since_activity
FROM user_context_embeddings;

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_history_updated_at BEFORE UPDATE ON chat_history_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_context_updated_at BEFORE UPDATE ON user_context_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roadmap_updated_at BEFORE UPDATE ON roadmap_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;