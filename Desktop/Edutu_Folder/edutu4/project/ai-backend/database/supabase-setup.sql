-- Supabase Vector Database Setup for Edutu AI Backend
-- This script sets up the vector database tables and functions for AI-powered recommendations

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create scholarships_embeddings table
CREATE TABLE IF NOT EXISTS public.scholarships_embeddings (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    scholarship_id text UNIQUE NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    title text NOT NULL,
    summary text,
    category text,
    provider text,
    location text,
    deadline timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create index on embedding for fast similarity search
CREATE INDEX IF NOT EXISTS scholarships_embeddings_embedding_idx 
ON public.scholarships_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create index on scholarship_id for fast lookups
CREATE INDEX IF NOT EXISTS scholarships_embeddings_scholarship_id_idx 
ON public.scholarships_embeddings (scholarship_id);

-- Create user_preferences_embeddings table
CREATE TABLE IF NOT EXISTS public.user_preferences_embeddings (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id text UNIQUE NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    education_level text,
    career_interests text[],
    learning_style text,
    time_availability text,
    preferred_locations text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create index on embedding for fast similarity search
CREATE INDEX IF NOT EXISTS user_preferences_embeddings_embedding_idx 
ON public.user_preferences_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS user_preferences_embeddings_user_id_idx 
ON public.user_preferences_embeddings (user_id);

-- Create function to match scholarships based on similarity
CREATE OR REPLACE FUNCTION public.match_scholarships(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 10
)
RETURNS TABLE(
    scholarship_id text,
    title text,
    summary text,
    category text,
    provider text,
    location text,
    deadline timestamp with time zone,
    similarity float
)
LANGUAGE sql STABLE
AS $$
SELECT
    s.scholarship_id,
    s.title,
    s.summary,
    s.category,
    s.provider,
    s.location,
    s.deadline,
    1 - (s.embedding <=> query_embedding) as similarity
FROM public.scholarships_embeddings s
WHERE s.embedding <=> query_embedding < 1 - match_threshold
ORDER BY s.embedding <=> query_embedding
LIMIT match_count;
$$;

-- Create function to get user recommendations
CREATE OR REPLACE FUNCTION public.get_user_recommendations(
    target_user_id text,
    match_threshold float DEFAULT 0.70,
    match_count int DEFAULT 3
)
RETURNS TABLE(
    scholarship_id text,
    title text,
    summary text,
    category text,
    provider text,
    location text,
    deadline timestamp with time zone,
    similarity float
)
LANGUAGE sql STABLE
AS $$
SELECT
    s.scholarship_id,
    s.title,
    s.summary,
    s.category,
    s.provider,
    s.location,
    s.deadline,
    1 - (s.embedding <=> u.embedding) as similarity
FROM public.scholarships_embeddings s
CROSS JOIN public.user_preferences_embeddings u
WHERE u.user_id = target_user_id
  AND s.embedding <=> u.embedding < 1 - match_threshold
ORDER BY s.embedding <=> u.embedding
LIMIT match_count;
$$;

-- Create function to find similar users (for collaborative filtering)
CREATE OR REPLACE FUNCTION public.find_similar_users(
    target_user_id text,
    match_threshold float DEFAULT 0.80,
    match_count int DEFAULT 5
)
RETURNS TABLE(
    user_id text,
    education_level text,
    career_interests text[],
    similarity float
)
LANGUAGE sql STABLE
AS $$
SELECT
    u2.user_id,
    u2.education_level,
    u2.career_interests,
    1 - (u1.embedding <=> u2.embedding) as similarity
FROM public.user_preferences_embeddings u1
CROSS JOIN public.user_preferences_embeddings u2
WHERE u1.user_id = target_user_id
  AND u2.user_id != target_user_id
  AND u1.embedding <=> u2.embedding < 1 - match_threshold
ORDER BY u1.embedding <=> u2.embedding
LIMIT match_count;
$$;

-- Create function to create extension if not exists (for Node.js to call)
CREATE OR REPLACE FUNCTION public.create_extension_if_not_exists(extension_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS ' || extension_name;
EXCEPTION
    WHEN duplicate_object THEN
        -- Extension already exists, do nothing
        NULL;
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Insufficient privileges to create extension %', extension_name;
END;
$$;

-- Create function to setup scholarships embeddings table (for Node.js to call)
CREATE OR REPLACE FUNCTION public.create_scholarships_embeddings_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.scholarships_embeddings (
        id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        scholarship_id text UNIQUE NOT NULL,
        embedding vector(1536),
        title text NOT NULL,
        summary text,
        category text,
        provider text,
        location text,
        deadline timestamp with time zone,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS scholarships_embeddings_embedding_idx 
    ON public.scholarships_embeddings 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

    CREATE INDEX IF NOT EXISTS scholarships_embeddings_scholarship_id_idx 
    ON public.scholarships_embeddings (scholarship_id);
END;
$$;

-- Create function to setup user preferences embeddings table (for Node.js to call)
CREATE OR REPLACE FUNCTION public.create_user_preferences_embeddings_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.user_preferences_embeddings (
        id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id text UNIQUE NOT NULL,
        embedding vector(1536),
        education_level text,
        career_interests text[],
        learning_style text,
        time_availability text,
        preferred_locations text[],
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS user_preferences_embeddings_embedding_idx 
    ON public.user_preferences_embeddings 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

    CREATE INDEX IF NOT EXISTS user_preferences_embeddings_user_id_idx 
    ON public.user_preferences_embeddings (user_id);
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create triggers to automatically update updated_at
CREATE TRIGGER scholarships_embeddings_updated_at
    BEFORE UPDATE ON public.scholarships_embeddings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_preferences_embeddings_updated_at
    BEFORE UPDATE ON public.user_preferences_embeddings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create function to get embedding statistics
CREATE OR REPLACE FUNCTION public.get_embedding_statistics()
RETURNS json
LANGUAGE sql STABLE
AS $$
SELECT json_build_object(
    'scholarship_embeddings_count', (
        SELECT COUNT(*) FROM public.scholarships_embeddings
    ),
    'user_embeddings_count', (
        SELECT COUNT(*) FROM public.user_preferences_embeddings
    ),
    'latest_scholarship_update', (
        SELECT MAX(updated_at) FROM public.scholarships_embeddings
    ),
    'latest_user_update', (
        SELECT MAX(updated_at) FROM public.user_preferences_embeddings
    ),
    'database_size_mb', (
        SELECT ROUND(
            pg_total_relation_size('public.scholarships_embeddings')::numeric / 1024 / 1024, 2
        ) + ROUND(
            pg_total_relation_size('public.user_preferences_embeddings')::numeric / 1024 / 1024, 2
        )
    )
);
$$;

-- Row Level Security (RLS) policies
ALTER TABLE public.scholarships_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy for scholarships_embeddings - read access for authenticated users
CREATE POLICY "Allow read access to scholarship embeddings" ON public.scholarships_embeddings
    FOR SELECT TO authenticated
    USING (true);

-- Policy for scholarships_embeddings - insert/update for service role only
CREATE POLICY "Allow service role to manage scholarship embeddings" ON public.scholarships_embeddings
    FOR ALL TO service_role
    USING (true);

-- Policy for user_preferences_embeddings - users can only access their own data
CREATE POLICY "Users can only access own preferences embeddings" ON public.user_preferences_embeddings
    FOR ALL TO authenticated
    USING (user_id = auth.uid()::text);

-- Service role can access all user preferences embeddings
CREATE POLICY "Service role can access all user preferences embeddings" ON public.user_preferences_embeddings
    FOR ALL TO service_role
    USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.scholarships_embeddings TO authenticated;
GRANT ALL ON public.scholarships_embeddings TO service_role;
GRANT ALL ON public.user_preferences_embeddings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_scholarships TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_recommendations TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_similar_users TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_embedding_statistics TO authenticated, service_role;

-- Create sample data for testing (remove in production)
/*
INSERT INTO public.scholarships_embeddings (scholarship_id, embedding, title, summary, category, provider, location) VALUES
(
    'test-scholarship-1',
    '[0.1, 0.2, 0.3]'::vector, -- This would be a real 1536-dimension embedding
    'Test Computer Science Scholarship',
    'A scholarship for computer science students interested in AI and machine learning.',
    'Technology',
    'Tech Foundation',
    'United States'
);
*/

-- Comments for documentation
COMMENT ON TABLE public.scholarships_embeddings IS 'Stores vector embeddings for scholarships/opportunities for AI-powered recommendations';
COMMENT ON TABLE public.user_preferences_embeddings IS 'Stores vector embeddings for user preferences to enable personalized recommendations';
COMMENT ON FUNCTION public.match_scholarships IS 'Finds scholarships similar to a given embedding vector using cosine similarity';
COMMENT ON FUNCTION public.get_user_recommendations IS 'Gets personalized scholarship recommendations for a specific user';
COMMENT ON FUNCTION public.find_similar_users IS 'Finds users with similar preferences for collaborative filtering';

-- End of setup script
SELECT 'Supabase vector database setup completed successfully' as status;