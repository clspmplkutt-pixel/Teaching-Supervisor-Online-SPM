import csv

# Read the current CSV
input_file = '/Users/analatkhankhen/.gemini/antigravity/brain/1a88d440-cee2-4e69-ad65-532b3f25b7cc/csv_export/tbl_Users.csv'
output_file = '/Users/analatkhankhen/.gemini/antigravity/brain/1a88d440-cee2-4e69-ad65-532b3f25b7cc/csv_export/tbl_Users_fixed.csv'

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

# Write with proper NULL handling
with open(output_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    for row in rows:
        # Convert empty strings to None, which csv.writer will write as empty cells
        cleaned_row = [None if cell == '' else cell for cell in row]
        writer.writerow(cleaned_row)

print(f"Fixed CSV written to {output_file}")
print("Sample row:")
with open(output_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    print(next(reader))
