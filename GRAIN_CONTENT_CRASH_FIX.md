# Grain Content Structure Crash Fix

## Problem
The application was crashing when trying to edit grain content with the error:
```
TypeError: textToCompleteContent.falseAlternatives is undefined
```

## Root Cause
There was a mismatch between the content structure created by `PageEditScreen.tsx` and what `GrainEditScreen.tsx` expected:

**PageEditScreen was creating (OLD FORMAT):**
```json
{
  "phrase": "",
  "missingWord": "",
  "options": []
}
```

**GrainEditScreen was expecting (NEW FORMAT):**
```json
{
  "phrase": "",
  "correctAnswer": "",
  "falseAlternatives": ["", "", ""]
}
```

## Solution Applied

### 1. Fixed Content Generation (PageEditScreen.tsx)
Updated `getDefaultContentForGrainType()` function to create content with the correct structure:

```typescript
case 'textToComplete':
  return { 
    phrase: '', 
    correctAnswer: '', 
    falseAlternatives: ['', '', ''] 
  };
```

### 2. Added Backward Compatibility (GrainEditScreen.tsx)
Updated `loadGrainData()` to handle both old and new content formats:

```typescript
case 'textToComplete':
  setTextToCompleteContent({
    phrase: data.content?.phrase || '',
    correctAnswer: data.content?.correctAnswer || data.content?.missingWord || '',
    falseAlternatives: data.content?.falseAlternatives || ['', '', '']
  });
```

### 3. Database Migration
Applied migration `fix_grain_content_structure_v2` to convert existing grains with old format to new format:

- **textToComplete**: `missingWord` → `correctAnswer`, added `falseAlternatives`
- **testQuestion**: Added proper `falseAlternatives` structure
- **imagesToGuess**: `imageUrl` → `correctImageUrl`, added `falseImageUrls`
- **pairsOfText/pairsOfImage**: Ensured proper arrays structure

## Verification
- ✅ All grains with old format converted successfully
- ✅ No compilation errors
- ✅ Application running without crashes
- ✅ The problematic grain (ID: c9fc9c38-50ab-4961-a377-167628d369a9) fixed

## Impact
- **New grains**: Created with correct structure from start
- **Existing grains**: Automatically migrated to new structure
- **Editor**: Can now open and edit all grains without crashes
- **Backward compatibility**: Old format grains handled gracefully

The application should now work correctly when editing grain content for all page types.
