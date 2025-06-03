-- Create the grains table for the Galeguia Editor
-- This table stores the individual educational units (grains) within pages

CREATE TABLE IF NOT EXISTS public.grains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK (type IN ('textToComplete', 'testQuestion', 'imagesToGuess', 'pairsOfText', 'pairsOfImage')),
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grains_page_id ON public.grains(page_id);
CREATE INDEX IF NOT EXISTS idx_grains_position ON public.grains(page_id, position);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.grains ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view grains from pages they have access to
CREATE POLICY "Users can view grains from accessible pages" ON public.grains
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.lessons l ON p.lesson_id = l.id
      JOIN public.modules m ON l.module_id = m.id
      JOIN public.courses c ON m.course_id = c.id
      WHERE p.id = grains.page_id 
      AND c.creator_id = auth.uid()
    )
  );

-- Policy: Users can insert grains into pages they own
CREATE POLICY "Users can insert grains into owned pages" ON public.grains
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.lessons l ON p.lesson_id = l.id
      JOIN public.modules m ON l.module_id = m.id
      JOIN public.courses c ON m.course_id = c.id
      WHERE p.id = grains.page_id 
      AND c.creator_id = auth.uid()
    )
  );

-- Policy: Users can update grains in pages they own
CREATE POLICY "Users can update grains in owned pages" ON public.grains
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.lessons l ON p.lesson_id = l.id
      JOIN public.modules m ON l.module_id = m.id
      JOIN public.courses c ON m.course_id = c.id
      WHERE p.id = grains.page_id 
      AND c.creator_id = auth.uid()
    )
  );

-- Policy: Users can delete grains from pages they own
CREATE POLICY "Users can delete grains from owned pages" ON public.grains
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.lessons l ON p.lesson_id = l.id
      JOIN public.modules m ON l.module_id = m.id
      JOIN public.courses c ON m.course_id = c.id
      WHERE p.id = grains.page_id 
      AND c.creator_id = auth.uid()
    )
  );

-- Add a constraint to limit grains per page to 15
ALTER TABLE public.grains 
ADD CONSTRAINT check_max_grains_per_page 
CHECK (
  (SELECT COUNT(*) FROM public.grains WHERE page_id = grains.page_id) <= 15
);

-- Add a unique constraint for position within each page
ALTER TABLE public.grains 
ADD CONSTRAINT unique_position_per_page 
UNIQUE (page_id, position);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at field
CREATE TRIGGER update_grains_updated_at 
  BEFORE UPDATE ON public.grains 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some example content validation (optional)
-- This ensures the JSONB content follows expected structure for each type
CREATE OR REPLACE FUNCTION validate_grain_content()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    WHEN 'textToComplete' THEN
      IF NOT (NEW.content ? 'phrase' AND NEW.content ? 'correctAnswer' AND NEW.content ? 'falseAlternatives') THEN
        RAISE EXCEPTION 'textToComplete grain must have phrase, correctAnswer, and falseAlternatives fields';
      END IF;
    WHEN 'testQuestion' THEN
      IF NOT (NEW.content ? 'question' AND NEW.content ? 'correctAnswer' AND NEW.content ? 'falseAlternatives') THEN
        RAISE EXCEPTION 'testQuestion grain must have question, correctAnswer, and falseAlternatives fields';
      END IF;
    WHEN 'imagesToGuess' THEN
      IF NOT (NEW.content ? 'correctImageUrl' AND NEW.content ? 'falseImageUrls' AND NEW.content ? 'correctWord') THEN
        RAISE EXCEPTION 'imagesToGuess grain must have correctImageUrl, falseImageUrls, and correctWord fields';
      END IF;
    WHEN 'pairsOfText' THEN
      IF NOT (NEW.content ? 'pairs') THEN
        RAISE EXCEPTION 'pairsOfText grain must have pairs field';
      END IF;
    WHEN 'pairsOfImage' THEN
      IF NOT (NEW.content ? 'pairs') THEN
        RAISE EXCEPTION 'pairsOfImage grain must have pairs field';
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for content validation
CREATE TRIGGER validate_grain_content_trigger
  BEFORE INSERT OR UPDATE ON public.grains
  FOR EACH ROW EXECUTE FUNCTION validate_grain_content();
