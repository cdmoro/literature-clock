import os
import csv
import errno, sys

print("Starting processing quotes...\n")

def check_csv_files(directory):
    total_errors = 0
    for file_name in os.listdir(directory):
        if file_name.endswith(".csv"):
            filepath = os.path.join(directory, file_name)
            errors = 0

            with open(filepath, 'r', newline='', encoding="cp437") as csvfile:
                reader = csv.DictReader(csvfile)
                rows = list(reader)

                print(f"Processing {file_name}...")

                # Loop through the rows and update the 'Quote time' if needed
                for row in rows:
                    if 'Quote time' in row and 'Quote' in row:
                        if row['Quote time'] not in row['Quote']:
                            errors += 1
                            if not row['Quote time'].startswith('*'):
                                row['Quote time'] = "* " + row['Quote time']

                # Write the updated rows back to the file
                fieldnames = reader.fieldnames  # Preserve the original column names
                with open(filepath, 'w', newline='', encoding="cp437") as csvfile:
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(rows)

            total_errors += errors

            print(f"- Lines: {len(rows) + 1}")
            print(f"- Errors found: {errors}\n")
    return total_errors

quotes_path = 'quotes/'
result = check_csv_files(quotes_path)

if result > 0:
    sys.exit(f"Error. {result} invalid quotes were found!")

print("Processing finished, all good!")
