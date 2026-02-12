
import re
import csv
import os
import zipfile

def extract_all_data(sql_file, output_dir):
    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # regex to find table names in INSERT INTO statements
    # We want unique table names
    # pattern: INSERT INTO `table_name`
    tables = list(set(re.findall(r"INSERT INTO `(.*?)`", content)))
    
    if not tables:
        print("No tables with data found.")
        return

    print(f"Found {len(tables)} tables with data: {', '.join(tables)}")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    extracted_files = []

    for table_name in tables:
        # Re-use logic for each table
        # We need to find the specific block for this table
        # Be careful with multiple INSERT statements for the same table
        
        # Regex to find ALL insert blocks for this table
        pattern = re.compile(f"INSERT INTO `{table_name}` \((.*?)\) VALUES\s*(.*?);", re.DOTALL)
        matches = pattern.findall(content)
        
        if not matches:
            continue
            
        print(f"Processing {table_name}...")
        
        all_rows = []
        headers = []
        
        for match in matches:
            columns_str = match[0]
            values_str = match[1]
            
            if not headers:
                headers = [col.strip().strip('`') for col in columns_str.split(',')]
            
            # Split values logic (reused)
            rows = []
            current_row = ""
            in_paren = 0
            in_quote = False
            
            for char in values_str:
                if char == "'" and (len(current_row) == 0 or current_row[-1] != '\\'):
                    in_quote = not in_quote
                
                if char == '(' and not in_quote:
                    in_paren += 1
                    if in_paren == 1: continue 
                elif char == ')' and not in_quote:
                    in_paren -= 1
                    if in_paren == 0: 
                        rows.append(current_row)
                        current_row = ""
                        continue
                
                if in_paren > 0:
                    current_row += char
            
            for row_str in rows:
                vals = []
                curr_val = ""
                in_q = False
                for c in row_str:
                    if c == "'" and (len(curr_val) == 0 or curr_val[-1] != '\\'):
                        in_q = not in_q
                    elif c == ',' and not in_q:
                        vals.append(curr_val.strip())
                        curr_val = ""
                        continue
                    curr_val += c
                vals.append(curr_val.strip())
                # Clean up values
                clean_vals = []
                for v in vals:
                    v_upper = v.upper()
                    # Handle MySQL's invalid dates by converting to NULL
                    if v == "'0000-00-00'" or v == "'0000-00-00 00:00:00'":
                        clean_vals.append(None)
                    # Handle empty strings as NULL (important for timestamps/dates)
                    elif v == "''" or v == '':
                        clean_vals.append(None)
                    elif v_upper == 'NULL':
                        clean_vals.append(None)
                    elif v.startswith("'") and v.endswith("'"):
                        inner = v[1:-1].replace("\\'", "'").replace('\\"', '"')
                        # If the inner value is empty, also treat as NULL
                        if inner == '':
                            clean_vals.append(None)
                        else:
                            clean_vals.append(inner)
                    else:
                        clean_vals.append(v)
                
                all_rows.append(clean_vals)
        
        csv_filename = os.path.join(output_dir, f"{table_name}.csv")
        with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(all_rows)
        
        extracted_files.append(csv_filename)
        print(f"  -> Extracted {len(all_rows)} rows to {csv_filename}")

    # Zip them up
    zip_path = os.path.join(output_dir, "csv_dump.zip")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in extracted_files:
            zipf.write(file, os.path.basename(file))
    
    print(f"All items zipped to {zip_path}")

# Run extraction
sql_file = '/Users/analatkhankhen/Downloads/www/phetcha7_pns2-20260205.sql'
output_dir = '/Users/analatkhankhen/.gemini/antigravity/brain/1a88d440-cee2-4e69-ad65-532b3f25b7cc/csv_export'
extract_all_data(sql_file, output_dir)
