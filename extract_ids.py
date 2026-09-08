import re

# Titles to remove
titles = ['นาย', 'นางสาว', 'นาง', 'ว่าที่ร้อยตรี', 'ว่าที่ร้อยโท', 'สิบเอก', 'ผอ.', 'รอง ผอ.', 'รองฯ', 'ครู', 'พระครู', 'พระ']

def clean_name(text):
    text = text.strip()
    # Remove numbering like "1. " or "1)"
    text = re.sub(r'^\d+[\.\)]\s*', '', text)
    # Remove titles
    for t in sorted(titles, key=len, reverse=True):
        if text.startswith(t):
            text = text[len(t):].strip()
            break
    # Remove parentheticals like (ย้าย), (เกษียณ)
    text = re.sub(r'\(.*?\)', '', text).strip()
    # Split into first and last name
    parts = text.split()
    if len(parts) >= 2:
        return parts[0], parts[1]
    elif len(parts) == 1:
        return parts[0], ''
    return '', ''

# Parse names to find
names_to_find = []
with open('names_to_remove.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or 'โรงเรียน' in line or 'เวลา' in line or ':' in line[:5] or 'ยกเลิกข้อความ' in line or 'เข้าร่วมแชท' in line:
            continue
        fname, lname = clean_name(line)
        if fname:
            names_to_find.append({'first': fname, 'last': lname, 'raw': line})

# Load DB users
db_users = []
with open('phetcha7_pns2-20260205.sql', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('(') and '),(' in line or '),$' in line or '),' in line:
            # Simple extraction: look for structure: (id, 'people_id', 'prefix', 'fname', 'lname'
            # Use regex to safely extract strings
            match = re.search(r"\(\d+,\s*'(\d{13})',\s*'\d+',\s*'([^']*)',\s*'([^']*)'", line)
            if match:
                db_users.append({
                    'people_id': match.group(1),
                    'first': match.group(2).strip(),
                    'last': match.group(3).strip()
                })

# Match users
found_ids = []
not_found = []

for n in names_to_find:
    matched = False
    for u in db_users:
        if n['first'] == u['first'] and (not n['last'] or n['last'] == u['last']):
            found_ids.append((u['people_id'], n['raw']))
            matched = True
            break
        # Sometimes last name has spelling diff
        elif n['first'] == u['first']:
            # Close enough if last name is missing or similar
            if not n['last']:
                found_ids.append((u['people_id'], n['raw']))
                matched = True
                break
    if not matched:
        not_found.append(n['raw'])

print("--- SQL SCRIPT ---")
print("UPDATE \"tbl_Users\" \nSET school = '' \nWHERE people_id IN (")
for i, (pid, raw) in enumerate(found_ids):
    comma = "," if i < len(found_ids) - 1 else ""
    print(f"  '{pid}'{comma} -- {raw}")
print(");\n")

print("--- NOT FOUND ---")
for nf in not_found:
    print(nf)
