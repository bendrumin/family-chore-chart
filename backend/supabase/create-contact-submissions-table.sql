-- Create contact_submissions table for storing contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    family_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    url TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_timestamp ON contact_submissions(timestamp);

-- Enable RLS (Row Level Security)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own submissions
CREATE POLICY "Users can insert their own contact submissions" ON contact_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create policy to allow users to view their own submissions
CREATE POLICY "Users can view their own contact submissions" ON contact_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy for admins to view all submissions (you'll need to set up admin roles)
-- CREATE POLICY "Admins can view all contact submissions" ON contact_submissions
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_contact_submissions_updated_at
    BEFORE UPDATE ON contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_submissions_updated_at(); 