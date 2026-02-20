-- Push Notifications & Kid Session Support
-- Adds tables for:
-- - push_subscriptions: Store browser push subscriptions for sending notifications
-- - kid_sessions: Temporary sessions for kid mode (PIN login without parent auth)

-- Push subscriptions (for web push notifications)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up subscriptions by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
-- Prevent duplicate subscriptions (same endpoint = same device/browser)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Kid sessions (temporary tokens for kid mode after PIN verification)
CREATE TABLE IF NOT EXISTS kid_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
    token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kid_sessions_token ON kid_sessions(token);
CREATE INDEX IF NOT EXISTS idx_kid_sessions_expires_at ON kid_sessions(expires_at);

-- RLS: Parents can create sessions for their children (during PIN verify)
ALTER TABLE kid_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can insert kid sessions for own children" ON kid_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = kid_sessions.child_id
            AND children.user_id = auth.uid()
        )
    );

-- SELECT/DELETE for kid_sessions: API uses service role to validate tokens (no user session)
