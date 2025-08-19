-- Database schema for Opportunities Aggregator
-- Supports PostgreSQL with JSONB for flexible data storage

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For performance monitoring

-- Enums
CREATE TYPE opportunity_type AS ENUM (
    'scholarship', 'fellowship', 'internship', 'job', 
    'grant', 'competition', 'course', 'freelance', 'volunteer'
);

CREATE TYPE opportunity_status AS ENUM (
    'active', 'expired', 'upcoming', 'draft'
);

CREATE TYPE experience_level AS ENUM (
    'entry', 'intermediate', 'senior', 'executive'
);

CREATE TYPE remote_type AS ENUM (
    'remote', 'hybrid', 'onsite'
);

CREATE TYPE employment_type AS ENUM (
    'full-time', 'part-time', 'contract', 'temporary'
);

-- Core opportunities table
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE NOT NULL, -- ID from source system
    
    -- Basic information
    title VARCHAR(500) NOT NULL,
    description TEXT,
    summary VARCHAR(1000),
    type opportunity_type NOT NULL,
    status opportunity_status DEFAULT 'active',
    
    -- Organization details
    organization_name VARCHAR(255) NOT NULL,
    organization_email VARCHAR(255),
    organization_phone VARCHAR(50),
    organization_website VARCHAR(500),
    application_url VARCHAR(500),
    
    -- Location (stored as JSONB for flexibility)
    location JSONB DEFAULT '{}',
    
    -- Compensation (stored as JSONB for flexibility)
    compensation JSONB DEFAULT '{}',
    
    -- Requirements (stored as JSONB for flexibility)
    requirements JSONB DEFAULT '{}',
    
    -- Important dates
    application_deadline TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    announcement_date TIMESTAMP WITH TIME ZONE,
    
    -- Media
    images JSONB DEFAULT '[]', -- Array of image URLs
    documents JSONB DEFAULT '[]', -- Array of document URLs
    
    -- Metadata
    source_name VARCHAR(100) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_verified TIMESTAMP WITH TIME ZONE,
    trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    
    -- Full-text search
    search_vector tsvector,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Specialized tables for different opportunity types

CREATE TABLE scholarship_details (
    opportunity_id UUID PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
    field_of_study JSONB DEFAULT '[]', -- Array of fields
    degree_level JSONB DEFAULT '[]', -- Array of degree levels
    coverage_type VARCHAR(20) CHECK (coverage_type IN ('full', 'partial', 'stipend')),
    amount_min DECIMAL(12,2),
    amount_max DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    renewable BOOLEAN DEFAULT FALSE,
    gpa_requirement DECIMAL(3,2),
    gpa_scale DECIMAL(3,2)
);

CREATE TABLE job_details (
    opportunity_id UUID PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
    department VARCHAR(255),
    employment_type employment_type DEFAULT 'full-time',
    experience_level experience_level,
    remote_type remote_type,
    industry JSONB DEFAULT '[]', -- Array of industries
    company_size VARCHAR(20) CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    benefits JSONB DEFAULT '[]'
);

CREATE TABLE internship_details (
    opportunity_id UUID PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
    duration_months INTEGER,
    credits_available BOOLEAN DEFAULT FALSE,
    mentorship_provided BOOLEAN DEFAULT FALSE,
    conversion_potential BOOLEAN DEFAULT FALSE,
    stipend_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD'
);

CREATE TABLE grant_details (
    opportunity_id UUID PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
    funding_agency VARCHAR(255),
    project_type JSONB DEFAULT '[]',
    collaboration_required BOOLEAN DEFAULT FALSE,
    max_funding_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    funding_duration_months INTEGER
);

-- Tags system
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE opportunity_tags (
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) DEFAULT 1.0, -- AI confidence in tag assignment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (opportunity_id, tag_id)
);

-- Data sources tracking
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    base_url VARCHAR(500),
    api_endpoint VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER,
    last_successful_fetch TIMESTAMP WITH TIME ZONE,
    last_error TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    total_opportunities_fetched INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.0,
    config JSONB DEFAULT '{}', -- Source-specific configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fetch history for tracking data source performance
CREATE TABLE fetch_history (
    id SERIAL PRIMARY KEY,
    data_source_id INTEGER REFERENCES data_sources(id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    opportunities_found INTEGER DEFAULT 0,
    opportunities_created INTEGER DEFAULT 0,
    opportunities_updated INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER,
    search_params JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity tracking (for analytics)
CREATE TABLE search_queries (
    id SERIAL PRIMARY KEY,
    query_text VARCHAR(500),
    search_params JSONB,
    result_count INTEGER,
    user_ip INET,
    user_agent TEXT,
    response_time_ms INTEGER,
    cached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache management (for persistent cache)
CREATE TABLE cache_entries (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(64) UNIQUE NOT NULL,
    search_params JSONB NOT NULL,
    result_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    access_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    size_bytes INTEGER
);

-- Indexes for performance
CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_deadline ON opportunities(application_deadline);
CREATE INDEX idx_opportunities_source ON opportunities(source_name);
CREATE INDEX idx_opportunities_updated ON opportunities(last_updated);
CREATE INDEX idx_opportunities_trust_score ON opportunities(trust_score);
CREATE INDEX idx_opportunities_search_vector ON opportunities USING gin(search_vector);

-- Location indexes (assuming JSONB structure like {"country": "USA", "city": "New York"})
CREATE INDEX idx_opportunities_location_country ON opportunities USING gin((location->>'country'));
CREATE INDEX idx_opportunities_location_remote ON opportunities USING gin((location->>'remote'));

-- Compound indexes for common queries
CREATE INDEX idx_opportunities_type_status_deadline ON opportunities(type, status, application_deadline);
CREATE INDEX idx_opportunities_source_updated ON opportunities(source_name, last_updated);

-- Tag search optimization
CREATE INDEX idx_opportunity_tags_tag_id ON opportunity_tags(tag_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);

-- Data source performance indexes
CREATE INDEX idx_fetch_history_source_started ON fetch_history(data_source_id, started_at);
CREATE INDEX idx_fetch_history_status ON fetch_history(status);

-- Search query analytics
CREATE INDEX idx_search_queries_created ON search_queries(created_at);
CREATE INDEX idx_search_queries_query_text ON search_queries USING gin(to_tsvector('english', query_text));

-- Cache indexes
CREATE INDEX idx_cache_entries_expires ON cache_entries(expires_at);
CREATE INDEX idx_cache_entries_access_count ON cache_entries(access_count);
CREATE INDEX idx_cache_entries_last_accessed ON cache_entries(last_accessed);

-- Triggers for maintaining search_vector
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.summary, '') || ' ' ||
        COALESCE(NEW.organization_name, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
    BEFORE INSERT OR UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_data_sources_updated_at
    BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Active opportunities with details
CREATE VIEW active_opportunities AS
SELECT 
    o.*,
    sd.coverage_type,
    sd.amount_max as scholarship_amount,
    jd.salary_max as job_salary,
    jd.employment_type,
    jd.remote_type,
    id.duration_months as internship_duration,
    gd.max_funding_amount as grant_amount
FROM opportunities o
LEFT JOIN scholarship_details sd ON o.id = sd.opportunity_id
LEFT JOIN job_details jd ON o.id = jd.opportunity_id  
LEFT JOIN internship_details id ON o.id = id.opportunity_id
LEFT JOIN grant_details gd ON o.id = gd.opportunity_id
WHERE o.status = 'active' 
AND (o.application_deadline IS NULL OR o.application_deadline > NOW());

-- Opportunity statistics by source
CREATE VIEW source_statistics AS
SELECT 
    ds.name as source_name,
    ds.is_active,
    COUNT(o.id) as total_opportunities,
    COUNT(CASE WHEN o.status = 'active' THEN 1 END) as active_opportunities,
    AVG(o.trust_score) as avg_trust_score,
    MAX(o.last_updated) as latest_update,
    ds.success_rate,
    ds.total_opportunities_fetched
FROM data_sources ds
LEFT JOIN opportunities o ON ds.name = o.source_name
GROUP BY ds.id, ds.name, ds.is_active, ds.success_rate, ds.total_opportunities_fetched;

-- Popular search terms
CREATE VIEW popular_searches AS
SELECT 
    query_text,
    COUNT(*) as search_count,
    AVG(result_count) as avg_results,
    AVG(response_time_ms) as avg_response_time,
    COUNT(CASE WHEN cached THEN 1 END) as cached_searches,
    MAX(created_at) as last_searched
FROM search_queries 
WHERE created_at > NOW() - INTERVAL '30 days'
AND query_text IS NOT NULL
GROUP BY query_text
ORDER BY search_count DESC;

-- Sample data for testing
INSERT INTO data_sources (name, base_url, priority, rate_limit_per_minute) VALUES
('Google Custom Search', 'https://www.googleapis.com/customsearch/v1', 1, 100),
('Mock University Portal', 'https://example.edu/api', 2, 60),
('Government Jobs API', 'https://api.usajobs.gov', 3, 120);

INSERT INTO tags (name, category, description) VALUES
('international', 'scope', 'International opportunities'),
('undergraduate', 'education', 'Undergraduate level'),
('graduate', 'education', 'Graduate level'),
('stem', 'field', 'Science, Technology, Engineering, Mathematics'),
('research', 'type', 'Research-focused opportunities'),
('full-time', 'schedule', 'Full-time commitment'),
('remote', 'location', 'Remote work available'),
('funded', 'financial', 'Funding provided'),
('deadline-soon', 'urgency', 'Application deadline within 30 days');

-- Functions for common operations

-- Function to get opportunities by type with filters
CREATE OR REPLACE FUNCTION get_opportunities_by_type(
    p_type opportunity_type,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0,
    p_country VARCHAR DEFAULT NULL,
    p_remote_ok BOOLEAN DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    title VARCHAR,
    organization_name VARCHAR,
    application_deadline TIMESTAMP WITH TIME ZONE,
    trust_score INTEGER,
    location JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id, o.title, o.organization_name, 
        o.application_deadline, o.trust_score, o.location
    FROM opportunities o
    WHERE o.type = p_type 
    AND o.status = 'active'
    AND (p_country IS NULL OR o.location->>'country' = p_country)
    AND (p_remote_ok IS NULL OR (p_remote_ok AND o.location->>'remote' IN ('remote', 'hybrid')))
    AND (o.application_deadline IS NULL OR o.application_deadline > NOW())
    ORDER BY o.trust_score DESC, o.last_updated DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to update opportunity view count
CREATE OR REPLACE FUNCTION increment_view_count(opportunity_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE opportunities 
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = opportunity_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cache_entries WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE opportunities IS 'Core table storing all opportunity data with flexible JSONB fields';
COMMENT ON TABLE scholarship_details IS 'Extended details specific to scholarship opportunities';
COMMENT ON TABLE job_details IS 'Extended details specific to job opportunities';
COMMENT ON TABLE data_sources IS 'Configuration and tracking for external data sources';
COMMENT ON TABLE fetch_history IS 'Audit trail of data fetching operations';
COMMENT ON COLUMN opportunities.search_vector IS 'Full-text search index for title, description, and organization';
COMMENT ON COLUMN opportunities.trust_score IS 'Calculated trust score (0-100) based on source reliability and data quality';