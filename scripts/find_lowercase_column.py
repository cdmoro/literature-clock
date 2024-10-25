import os
import csv
import sys

# Function to remove quotes from the beginning of a string
def remove_quotes(text):
    if text.startswith('"') or text.startswith("'"):
        return text[1:]  # Remove the first quote
    return text

# Check if the user provided the column name as an argument
if len(sys.argv) < 2:
    print("Usage: python fint_lowercase_column.py <column_name>")
    sys.exit(1)

# Define the fixed folder path containing the CSV files
folder_path = 'quotes'

# Column name to check for lowercase letters
column_name = sys.argv[1]

# Iterate over all files in the folder
for filename in os.listdir(folder_path):
    if filename.endswith('.csv'):
        file_path = os.path.join(folder_path, filename)
        
        # Open the CSV file
        with open(file_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            # Check if the column exists in the CSV
            if column_name not in reader.fieldnames:
                print(f"File '{filename}' does not contain the column '{column_name}'")
                continue
            
            # Iterate over each row in the CSV file
            for row in reader:
                value = row[column_name]  # Access the specified column
                
                # Remove quotes from the beginning if present
                value_no_quotes = remove_quotes(value)
                
                # Check if the value starts with a lowercase letter
                if value_no_quotes and value_no_quotes[0].islower():
                    print(f"File '{filename}', row {reader.line_num}: {column_name} starts with lowercase: {value}")
