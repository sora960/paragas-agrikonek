-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- *** CONVERSATIONS TABLE ***
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'announcement')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** CONVERSATION PARTICIPANTS TABLE ***
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(conversation_id, user_id)
);

-- *** MESSAGES TABLE ***
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'system')),
    attachment_url TEXT,
    attachment_type VARCHAR(50),
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** MESSAGE STATUS TABLE ***
CREATE TABLE IF NOT EXISTS public.message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    is_delivered BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(message_id, user_id)
);

-- *** CREATE INDEXES ***
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON public.message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user_id ON public.message_status(user_id);

-- *** CREATE VIEW FOR UNREAD MESSAGE COUNT ***
CREATE OR REPLACE VIEW public.unread_message_counts AS
SELECT 
    cp.user_id,
    cp.conversation_id,
    COUNT(m.id) AS unread_count
FROM 
    public.conversation_participants cp
    JOIN public.messages m ON m.conversation_id = cp.conversation_id
    LEFT JOIN public.message_status ms ON ms.message_id = m.id AND ms.user_id = cp.user_id
WHERE 
    m.sender_id != cp.user_id
    AND (ms.is_read = FALSE OR ms.is_read IS NULL)
    AND cp.is_active = TRUE
    AND m.created_at > cp.last_read_at
GROUP BY 
    cp.user_id, cp.conversation_id;

-- *** CREATE VIEW FOR CONVERSATION PREVIEWS ***
CREATE OR REPLACE VIEW public.conversation_previews AS
SELECT 
    c.id AS conversation_id,
    c.title,
    c.type,
    lm.id AS last_message_id,
    lm.content AS last_message_content,
    lm.created_at AS last_message_time,
    lm.sender_id AS last_message_sender,
    COUNT(DISTINCT cp.user_id) AS participant_count,
    u.first_name || ' ' || u.last_name AS last_sender_name
FROM 
    public.conversations c
    JOIN public.conversation_participants cp ON cp.conversation_id = c.id
    LEFT JOIN (
        SELECT DISTINCT ON (conversation_id) *
        FROM public.messages
        ORDER BY conversation_id, created_at DESC
    ) lm ON lm.conversation_id = c.id
    LEFT JOIN public.users u ON u.id = lm.sender_id
GROUP BY 
    c.id, c.title, c.type, lm.id, lm.content, lm.created_at, lm.sender_id, u.first_name, u.last_name;

-- *** ADD TIMESTAMP UPDATE TRIGGER ***
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- *** ADD MESSAGE STATUS TRIGGER ***
CREATE OR REPLACE FUNCTION create_message_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.message_status (message_id, user_id, is_delivered, delivered_at)
    SELECT 
        NEW.id, 
        cp.user_id, 
        FALSE, 
        NULL
    FROM 
        public.conversation_participants cp
    WHERE 
        cp.conversation_id = NEW.conversation_id
        AND cp.user_id != NEW.sender_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_message_status
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION create_message_status();

-- *** ROW LEVEL SECURITY POLICIES ***
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

-- Policy for viewing conversations
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
    )
);

-- Policy for inserting conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (
    created_by = auth.uid()
);

-- Policy for viewing conversation participants
CREATE POLICY "Users can view participants of conversations they participate in" 
ON public.conversation_participants FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
    )
);

-- Policy for inserting conversation participants
CREATE POLICY "Conversation admin can add participants" 
ON public.conversation_participants FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
    )
    OR 
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
        AND c.created_by = auth.uid()
    )
);

-- Policy for viewing messages
CREATE POLICY "Users can view messages in conversations they participate in" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
    )
);

-- Policy for inserting messages
CREATE POLICY "Users can send messages to conversations they participate in" 
ON public.messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = TRUE
    )
    AND sender_id = auth.uid()
);

-- Policy for updating messages
CREATE POLICY "Users can edit their own messages" 
ON public.messages FOR UPDATE 
USING (
    sender_id = auth.uid()
);

-- Policy for viewing message status
CREATE POLICY "Users can view status of their messages" 
ON public.message_status FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.id = message_id
        AND m.sender_id = auth.uid()
    )
    OR user_id = auth.uid()
);

-- Policy for updating message status
CREATE POLICY "Users can update their own message status" 
ON public.message_status FOR UPDATE 
USING (
    user_id = auth.uid()
); 