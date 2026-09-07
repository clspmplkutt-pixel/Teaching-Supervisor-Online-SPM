import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raspdeormxzlsusybkuz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhc3BkZW9ybXh6bHN1c3lia3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MTgxNjgsImV4cCI6MjA4NTk5NDE2OH0.rZIXQpxVwGq-r070azYnGIAO1pzY64UBQ8c4voGzg_g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching all users with Buddhist year birthdays (year between 2400 and 2600)...');
  
  let allUsers = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('tbl_Users')
      .select('id, people_id, name, lastname, birthday, level, school')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) {
      console.error('Error fetching users:', error);
      process.exit(1);
    }
    allUsers.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  const targets = [];
  for (const u of allUsers) {
    if (!u.birthday) continue;
    const parts = u.birthday.trim().split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      if (y >= 2400 && y <= 2600) {
        const newY = y - 543;
        const newBirthday = `${newY}-${parts[1]}-${parts[2]}`;
        targets.push({
          id: u.id,
          people_id: u.people_id,
          name: `${u.name} ${u.lastname}`,
          oldBirthday: u.birthday,
          newBirthday,
        });
      }
    }
  }

  console.log(`Found ${targets.length} users with Buddhist Era birthdays to convert.`);

  let successCount = 0;
  let failCount = 0;

  for (const t of targets) {
    let query = supabase.from('tbl_Users').update({ birthday: t.newBirthday });
    if (t.people_id) {
      query = query.eq('people_id', t.people_id);
    } else {
      query = query.eq('id', t.id);
    }
    const { error } = await query;
    if (error) {
      console.error(`Failed to update ${t.name} (${t.people_id || t.id}):`, error.message);
      failCount++;
    } else {
      console.log(`[OK] ${t.name} (${t.people_id}): ${t.oldBirthday} -> ${t.newBirthday}`);
      successCount++;
    }
  }

  console.log(`\nCompleted! Successfully updated: ${successCount}, Failed: ${failCount}`);
}

main().catch(console.error);
