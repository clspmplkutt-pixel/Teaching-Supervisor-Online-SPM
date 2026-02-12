# Quick Fix for tbl_Users Import - UPDATED

## Error You're Getting
```
ERROR: null value in column "khet_code" of relation "tbl_Users" violates not-null constraint
```

## What to Do NOW

### Step 1: Run the Updated SQL Fix
1. Go to Supabase Dashboard: https://raspdeormxzlsusybkuz.supabase.co
2. Click **SQL Editor** → **New Query**
3. Copy **ALL** content from `fix_tbl_users_constraints.sql`
4. Paste and click **Run**

### Step 2: Verify the Fix Worked
Run this query to check:
```sql
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tbl_Users' 
  AND column_name IN (
    'teach_subject', 'teach_subject_name', 'teach_level',
    'picture', 'phone', 'email', 'khet_code', 
    'lastupdate', 'lastlogin'
  );
```

All should show `is_nullable = 'YES'`

### Step 3: Handle Zero-Date Timestamps
Before importing, you need to handle MySQL's `0000-00-00 00:00:00` timestamps.

**If using CSV import:**
```bash
# Use sed to replace zero-dates with empty strings
sed 's/0000-00-00 00:00:00//g' users.csv > users_fixed.csv
```

**If using SQL INSERT statements:**
Just make sure NULL is used instead of '0000-00-00 00:00:00'

### Step 4: Retry Your Import
Now you can retry importing your data!

## All Fixed Columns
✅ teach_subject  
✅ teach_subject_name  
✅ teach_level  
✅ picture  
✅ phone  
✅ email  
✅ khet_code (NEW - just added)  
✅ lastupdate (NEW - just added)  
✅ lastlogin (NEW - just added)

## If You Get Another Error
Look for patterns like:
- "null value in column X violates not-null constraint"
- Add that column to the fix script following the same pattern
- Run the updated fix
- Retry import
