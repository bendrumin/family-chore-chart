# Avatar Migration Guide

This guide explains how to safely add the new avatar functionality to your existing ChoreStar database without losing any data.

## 🛡️ Data Safety Guarantee

**This migration is 100% safe and will NOT destroy any existing data.** Here's why:

- ✅ **ADD COLUMN**: Only adds new columns, never removes existing ones
- ✅ **IF NOT EXISTS**: Prevents conflicts if columns already exist
- ✅ **NULLABLE**: New columns allow NULL values, so existing data is unaffected
- ✅ **NON-BREAKING**: Existing functionality continues to work unchanged

## 📋 Migration Steps

### Step 1: Verify Safety (Recommended)
```sql
-- Run this first to verify your database is ready
\i verify-migration-safety.sql
```

### Step 2: Run the Migration
```sql
-- This is the main migration script
\i safe-avatar-migration.sql
```

### Step 3: Verify Success
The migration script will automatically show you:
- Total number of children
- How many have avatar data
- Updated table structure
- Sample of existing data

## 🔍 What the Migration Does

### Adds New Columns:
- `avatar_url` (TEXT, nullable) - For DiceBear API URLs
- `avatar_file` (TEXT, nullable) - For uploaded files

### Adds Performance Indexes:
- `idx_children_avatar_url` - For fast avatar URL lookups
- `idx_children_avatar_file` - For fast avatar file lookups

### Preserves All Existing Data:
- All existing children remain unchanged
- All existing chores remain unchanged
- All existing completions remain unchanged
- All existing settings remain unchanged

## 🚨 Emergency Rollback

If you need to undo the migration (not recommended):

```sql
-- ONLY use this if absolutely necessary
\i rollback-avatar-migration.sql
```

## 📊 Before vs After

### Before Migration:
```sql
children table:
- id (UUID)
- name (TEXT)
- age (INTEGER)
- avatar_color (TEXT)
- user_id (UUID)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### After Migration:
```sql
children table:
- id (UUID)
- name (TEXT)
- age (INTEGER)
- avatar_color (TEXT)
- avatar_url (TEXT) ← NEW
- avatar_file (TEXT) ← NEW
- user_id (UUID)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## ✅ Verification Checklist

After running the migration, verify:

- [ ] `avatar_url` column exists and is nullable
- [ ] `avatar_file` column exists and is nullable
- [ ] All existing children data is preserved
- [ ] Indexes are created successfully
- [ ] No errors in the migration output

## 🎯 Next Steps

After successful migration:

1. **Deploy Frontend**: The new avatar picker will work immediately
2. **Test Functionality**: Try adding/editing children with new avatars
3. **Monitor Performance**: The new indexes should improve query speed

## 📞 Support

If you encounter any issues:

1. Check the migration output for error messages
2. Verify your database user has ALTER TABLE permissions
3. Ensure you're running the migration on the correct database
4. Use the rollback script if needed (though this is rarely necessary)

---

**Remember: This migration is designed to be safe and reversible. Your existing data is protected!** 🛡️
