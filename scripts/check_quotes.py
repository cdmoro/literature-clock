import os
import csv

print("Starting processing quotes...\n")

def check_csv_files(directory):
    for file_name in os.listdir(directory):
        if file_name.endswith(".csv"):
            filepath = os.path.join(directory, file_name)
            errors = 0

            print(f"Processing {file_name}...")

            with open(filepath, 'r', newline='') as csvfile:
                reader = csv.reader(csvfile)
                rows = list(reader)
                for row in rows[1:]:
                    if len(row) >= 3 and row[1] not in row[2]:
                        row[1] = "* " + row[1]
                        errors += 1
                with open(filepath, 'w', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerows(rows)

            print(f"Errors found: {errors}\n")

quotes_path = 'quotes/'
check_csv_files(quotes_path)

print("Processing finished.")