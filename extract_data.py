
import re
import csv
import sys

def extract_insert_data(sql_file, table_name, output_csv):
    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find INSERT INTO statements for the specific table
    pattern = re.compile(f"INSERT INTO `{table_name}` \((.*?)\) VALUES\s*(.*?);", re.DOTALL)
    
    matches = pattern.findall(content)
    
    if not matches:
        print(f"No data found for {table_name}")
        return

    print(f"Found data for {table_name}. Processing...")

    all_rows = []
    headers = []

    for match in matches:
        columns_str = match[0]
        values_str = match[1]
        
        # Clean up headers
        headers = [col.strip().strip('`') for col in columns_str.split(',')]
        
        # Split values - this is tricky because of commas in strings
        rows = []
        current_row = ""
        in_paren = 0
        in_quote = False
        
        for char in values_str:
            if char == "'" and (len(current_row) == 0 or current_row[-1] != '\\'): # Simple quote check
                in_quote = not in_quote
            
            if char == '(' and not in_quote:
                in_paren += 1
                if in_paren == 1: continue # Start of row
            elif char == ')' and not in_quote:
                in_paren -= 1
                if in_paren == 0: # End of row
                    rows.append(current_row)
                    current_row = ""
                    continue
            
            if in_paren > 0:
                current_row += char
        
        # Now parse each row
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
                elif v_upper == 'NULL':
                    clean_vals.append(None)
                elif v.startswith("'") and v.endswith("'"):
                    clean_vals.append(v[1:-1].replace("\\'", "'").replace('\\"', '"'))
                else:
                    clean_vals.append(v)
            
            all_rows.append(clean_vals)

    # Write to CSV
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(all_rows)
    
    print(f"Successfully wrote {len(all_rows)} rows to {output_csv}")

# Run extraction
sql_file = '/Users/analatkhankhen/Downloads/www/phetcha7_pns2-20260205.sql'
extract_insert_data(sql_file, 'tbl_school', 'schools.csv')
extract_insert_data(sql_file, 'tbl_Users', 'users.csv')
extract_insert_data(sql_file, 'tbl_user', 'admin_users.csv') # Also extract admin users
