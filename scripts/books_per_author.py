import os
import pandas as pd

# Define the folder containing the CSV files
folder_path = 'quotes'

# List all CSV files in the folder
csv_files = [f for f in os.listdir(folder_path) if f.endswith('.csv')]

# Dictionary to store the book count by author and file
book_counts = {}

# Process each CSV file
for file in csv_files:
    file_path = os.path.join(folder_path, file)
    
    # Read the CSV file
    df = pd.read_csv(file_path, sep="|")
    
    # Group by 'Author' and count the number of unique 'Title' for each author
    author_counts = df.groupby('Author')['Title'].nunique()
    
    # Store the results in the book_counts dictionary
    for author, count in author_counts.items():
        if author not in book_counts:
            book_counts[author] = {}
        book_counts[author][file] = count

# Create a DataFrame from the book_counts dictionary
book_counts_df = pd.DataFrame(book_counts).T

# Fill NaN values with 0 (in case an author doesn't have books in some files)
book_counts_df = book_counts_df.fillna(0)

# Sort the DataFrame by author names
book_counts_df = book_counts_df.sort_index()

# Create a DataFrame for authors with discrepancies
discrepancy_authors = {}
for author, counts in book_counts.items():
    unique_counts = set(counts.values())
    if len(unique_counts) > 1:
        discrepancy_authors[author] = counts

# Convert discrepancies to a DataFrame
discrepancy_df = pd.DataFrame(discrepancy_authors).T

# Fill NaN values with 0
discrepancy_df = discrepancy_df.fillna(0)

# Save the discrepancies to a new CSV file
output_file = os.path.join('scripts/author_discrepancies.csv')
discrepancy_df.to_csv(output_file)

print("CSV file 'author_discrepancies.csv' has been created successfully.")
