-- Add new grain types: textToGuess and audioToGuess
-- Migration created on 2025-06-03

-- First, drop the constraint to modify it
ALTER TABLE public.grains DROP CONSTRAINT IF EXISTS grains_type_check;

-- Add the new constraint with the additional grain types
ALTER TABLE public.grains ADD CONSTRAINT grains_type_check 
  CHECK (type IN ('textToComplete', 'testQuestion', 'imagesToGuess', 'textToGuess', 'audioToGuess', 'pairsOfText', 'pairsOfImage'));

-- Update the validation function to include the new grain types
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
    WHEN 'textToGuess' THEN
      IF NOT (NEW.content ? 'imageUrl' AND NEW.content ? 'correctAnswer' AND NEW.content ? 'falseAlternatives') THEN
        RAISE EXCEPTION 'textToGuess grain must have imageUrl, correctAnswer, and falseAlternatives fields';
      END IF;
    WHEN 'audioToGuess' THEN
      IF NOT (NEW.content ? 'correctWord' AND NEW.content ? 'correctAudioUrl' AND NEW.content ? 'falseAudioUrls') THEN
        RAISE EXCEPTION 'audioToGuess grain must have correctWord, correctAudioUrl, and falseAudioUrls fields';
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

-- The trigger already exists, so no need to recreate it
