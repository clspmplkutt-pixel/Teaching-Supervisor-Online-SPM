import csv
import re

input_file = '/Users/analatkhankhen/.gemini/antigravity/brain/1a88d440-cee2-4e69-ad65-532b3f25b7cc/csv_export/tbl_Users.csv'
output_file = '/Users/analatkhankhen/.gemini/antigravity/brain/1a88d440-cee2-4e69-ad65-532b3f25b7cc/tbl_Users_INSERT.sql'

# Read CSV
with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Generate SQL INSERT statements
sql_lines = ["-- SQL INSERT for tbl_Users with proper NULL handling\n"]

for row in rows:
    # Process each field, converting empty strings to NULL
    values = []
    for key, value in row.items():
        if value == '' or value is None:
            values.append('NULL')
        elif key in ['headDepartment', 'chairman', 'id']:  # Integer fields
            values.append(value if value else 'NULL')
        else:  # String fields
            # Escape single quotes
            escaped = value.replace("'", "''")
            values.append(f"'{escaped}'")
    
    sql = f"INSERT INTO \"tbl_Users\" VALUES ({', '.join(values)});\n"
    sql_lines.append(sql)

# Write SQL file
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(sql_lines)

print(f"Generated SQL INSERT script: {output_file}")
print(f"Total rows: {len(rows)}")
