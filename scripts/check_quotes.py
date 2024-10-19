import os
import csv

print("Starting processing quotes...\n")

def check_csv_files(directory):
    total_errors = 0
    for file_name in os.listdir(directory):
        if file_name.endswith(".csv"):
            filepath = os.path.join(directory, file_name)
            errors = 0

            print(f"Processing {file_name}...")

            with open(filepath, 'r', newline='', encoding="cp437") as csvfile:
                reader = csv.reader(csvfile)
                rows = list(reader)

                print(f'- Lines: {len(rows)}')

                for row in rows[1:]:
                    if len(row) >= 3 and row[1] not in row[2]:
                        errors += 1
                        if not row[1].startswith('*'):
                            row[1] = "* " + row[1]
                with open(filepath, 'w', newline='', encoding="cp437") as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerows(rows)

            total_errors += errors
            print(f"- Errors found: {errors}\n")
    return total_errors

quotes_path = 'quotes/'
result = check_csv_files(quotes_path)

print("Processing finished.")
print(f"Errors found: {result}")