# Database Setup Instructions for Grains System

## Overview
The Grains system has been implemented in the code but requires database setup. The `grains` table needs to be created in your Supabase database.

## Required SQL Script
A SQL script has been created at `create_grains_table.sql` that contains all the necessary database schema for the grains system.

## Setup Steps

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard: https://ovbtatknjeshtilqkxln.supabase.co
2. Navigate to the "SQL Editor" section
3. Copy the contents of `create_grains_table.sql` 
4. Paste and execute the SQL script
5. Verify the table was created in the "Table Editor" section

### Option 2: Using Supabase CLI (if installed)
```bash
supabase db reset
# or
supabase db push
```

### Option 3: Manual Table Creation (Minimal)
If you prefer to create just the basic table manually:

```sql
CREATE TABLE public.grains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK (type IN ('textToComplete', 'testQuestion', 'imagesToGuess', 'pairsOfText', 'pairsOfImage')),
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.grains ENABLE ROW LEVEL SECURITY;
```

## Table Schema Details

The `grains` table includes:
- **id**: UUID primary key
- **page_id**: Foreign key to pages table
- **position**: Integer for ordering grains within a page (1-15)
- **type**: Enum for grain types (textToComplete, testQuestion, imagesToGuess, pairsOfText, pairsOfImage)
- **content**: JSONB field storing type-specific content
- **created_at/updated_at**: Timestamps

## Features Included
- Row Level Security (RLS) policies for user access control
- Constraints limiting 15 grains per page
- Unique position constraint per page
- Content validation triggers
- Proper indexing for performance

## Verification
After running the SQL script, you should be able to:
1. Navigate through the app to a page
2. See the "Grains da Página (0/15)" section
3. Click "Adicionar Grain" to create new grains
4. Successfully create, edit, and delete grains

## Current Implementation Status
✅ Navigation integration (App.tsx)
✅ Page editor with grain management (PageEditScreen.tsx)
✅ Complete grain editor (GrainEditScreen.tsx)
❌ Database table creation (needs manual setup)

Once the database is set up, the entire Grains system will be fully functional!
