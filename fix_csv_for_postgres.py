#!/usr/bin/env python3
"""
Fix CSV files for PostgreSQL import by handling MySQL-specific issues:
1. Convert '0000-00-00 00:00:00' to empty string (will be NULL in PostgreSQL)
2. Ensure proper encoding (UTF-8)

Usage:
    python3 fix_csv_for_postgres.py input.csv output.csv
"""

import sys
import csv

def fix_csv_for_postgres(input_file, output_file):
    """Fix CSV file for PostgreSQL compatibility."""
    print(f"Processing {input_file}...")
    
    rows_processed = 0
    zero_dates_replaced = 0
    
    try:
        with open(input_file, 'r', encoding='utf-8') as infile, \
             open(output_file, 'w', encoding='utf-8', newline='') as outfile:
            
            reader = csv.reader(infile)
            writer = csv.writer(outfile)
            
            # Process each row
            for row in reader:
                fixed_row = []
                for cell in row:
                    # Replace MySQL zero-dates and zero-timestamps with empty string
                    if cell in ('0000-00-00 00:00:00', '0000-00-00', '0000-00-00 00:00:00.000000'):
                        fixed_row.append('')
                        zero_dates_replaced += 1
                    else:
                        fixed_row.append(cell)
                
                writer.writerow(fixed_row)
                rows_processed += 1
                
                if rows_processed % 1000 == 0:
                    print(f"  Processed {rows_processed} rows...")
        
        print(f"\n✅ Success!")
        print(f"  - Total rows processed: {rows_processed}")
        print(f"  - Zero-dates replaced: {zero_dates_replaced}")
        print(f"  - Output file: {output_file}")
        
    except FileNotFoundError:
        print(f"❌ Error: File '{input_file}' not found!")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 fix_csv_for_postgres.py input.csv output.csv")
        print("\nExample:")
        print("  python3 fix_csv_for_postgres.py users.csv users_fixed.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    fix_csv_for_postgres(input_file, output_file)
