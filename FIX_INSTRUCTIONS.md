# Fix for tbl_Users Import Error

## Problem
You're getting this error when trying to import data into `tbl_Users`:
```
ERROR: 23502: null value in column "teach_subject" of relation "tbl_Users" violates not-null constraint
```

## Root Cause
The PostgreSQL schema was auto-generated from the MySQL dump with NOT NULL constraints on several columns:
- `teach_subject`
- `teach_subject_name`
- `teach_level`
- `picture`
- `phone`
- `email`
- `khet_code`
- `lastupdate`
- `lastlogin`

However, the actual MySQL data contains **empty strings** (`''`) for text fields and **invalid timestamps** (`0000-00-00 00:00:00`) for these fields, especially for non-teacher users (directors, administrators, supervisors, etc.). PostgreSQL treats empty strings and NULL differently, and doesn't accept MySQL's zero-date format.

## Solution

### Option1: Run the Fix SQL Script (RECOMMENDED)

1. Open the Supabase Dashboard: https://raspdeormxzlsusybkuz.supabase.co
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `fix_tbl_users_constraints.sql`
5. Click **Run** or press `Ctrl/Cmd + Enter`
6. Verify changes were applied successfully

### Option 2: Manual Fix via Supabase Dashboard

Navigate to **Table Editor** → **tbl_Users** → click the gear icon next to each column:
- `teach_subject` - uncheck "Is Nullable"
- `teach_subject_name` - uncheck "Is Nullable"
- `teach_level` - uncheck "Is Nullable"  
- `picture` - uncheck "Is Nullable"
- `phone` - uncheck "Is Nullable"
- `email` - uncheck "Is Nullable"

## After Applying the Fix

Once you've run the SQL fix, you can retry importing your data. 

### Important: Handling MySQL Zero-Date Timestamps

Your MySQL data contains `'0000-00-00 00:00:00'` timestamps which are **not valid in PostgreSQL**. You need to:

**Option 1: If importing via CSV**
- Replace all `0000-00-00 00:00:00` with empty values (will be imported as NULL)
- You can use a script or text editor find/replace

**Option 2: If using SQL INSERT statements**
- Ensure the SQL converts `'0000-00-00 00:00:00'` to `NULL`
- Example: `NULLIF(lastupdate, '0000-00-00 00:00:00')`

**Option 3: Use the provided Python script (if you have one)**
- The data extraction scripts should handle this conversion automatically

## Files Created
- `fix_tbl_users_constraints.sql` - The SQL script to fix the constraints
- `FIX_INSTRUCTIONS.md` - This file with instructions

## Example of Data That Was Failing

Row 2 from your MySQL dump:
```sql
(2, '3650600731528', '003', 'นิสิต', 'เนินเพิ่มพิสุทธิ์', '10', '10008', ..., '', '', '', ...)
```

Notice the empty strings for `teach_subject`, `teach_subject_name`, and `teach_level` - this user is a district director, not a teacher, so these fields are empty.

## Need Help?

If you encounter any issues:
1. Check the Supabase logs in the Dashboard
2. Verify the SQL ran successfully
3. Try inserting a single test row to confirm the fix worked
