import csv
import os

input_folder = "quotes"
output_folder = os.path.join(input_folder, "converted")

# Create output folder if it does not exist
os.makedirs(output_folder, exist_ok=True)

# Iterate through all CSV files in the input folder
for filename in os.listdir(input_folder):
    if not filename.lower().endswith(".csv"):
        continue

    input_path = os.path.join(input_folder, filename)
    output_path = os.path.join(output_folder, filename)

    print(f"Converting {filename}...")

    with open(input_path, newline="", encoding="utf-8") as fin, \
         open(output_path, "w", newline="", encoding="utf-8") as fout:

        # Read the original CSV using comma as separator
        reader = csv.reader(fin)

        # Write the new CSV using pipe as separator
        writer = csv.writer(fout, delimiter="|")

        for row in reader:
            cleaned_row = []

            for col in row:
                # Remove triple quotes
                col = col.replace('"""', '')

                # Remove standard CSV quotes only (not typographic quotes)
                if col.startswith('"') and col.endswith('"'):
                    col = col[1:-1]

                cleaned_row.append(col)

            writer.writerow(cleaned_row)

print("✔️ Conversion complete. Files saved in: quotes/converted/")