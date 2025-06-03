#!/bin/bash

# Migration Runner Script for Page Types
# This script applies the page types migration to the Supabase database

echo "🚀 Starting Page Types Migration..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Apply the migration
echo "📋 Applying add_page_types_with_constraints migration..."

# Option 1: Using supabase db push (if connected to project)
if supabase db push 2>/dev/null; then
    echo "✅ Migration applied successfully using supabase db push"
else
    echo "⚠️  supabase db push failed, trying direct SQL execution..."
    
    # Option 2: Direct SQL execution
    if [ -f "migrations/add_page_types_with_constraints.sql" ]; then
        echo "📋 Executing SQL migration directly..."
        supabase db reset --db-url "$SUPABASE_DB_URL" < migrations/add_page_types_with_constraints.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Migration applied successfully"
        else
            echo "❌ Migration failed"
            exit 1
        fi
    else
        echo "❌ Migration file not found: migrations/add_page_types_with_constraints.sql"
        exit 1
    fi
fi

echo "🎉 Page Types Migration completed!"
echo ""
echo "📝 Summary of changes:"
echo "   - Added support for page types: Introduction, Booster, Comparation, Review, Custom"
echo "   - Changed default page type from 'text' to 'Introduction'"
echo "   - Added database constraints and index for better performance"
echo ""
echo "🔗 You can now create pages with predefined grain patterns!"
