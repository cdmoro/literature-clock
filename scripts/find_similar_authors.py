import pandas as pd
from fuzzywuzzy import fuzz
import sys

# Check if the user provided the CSV file path
if len(sys.argv) < 2:
    print("Usage: python find_similar_authors.py <locale>")
    sys.exit(1)

# Get the CSV file path from the command-line argument
locale = sys.argv[1]

# Load the CSV file
df = pd.read_csv("quotes/quotes." + locale + ".csv", sep="|")

# Define a similarity threshold (adjustable)
threshold = 85

# Get the unique authors
book_authors = df['Author'].unique()

# Compare titles
similar_authors = []

for i, author1 in enumerate(book_authors):
    for author2 in book_authors[i+1:]:
        similarity_ratio = fuzz.ratio(author1, author2)
        if similarity_ratio > threshold:
            similar_authors.append((author1, author2, similarity_ratio))

# Display the results
for t1, t2, ratio in similar_authors:
    print(f"Similar authors: '{t1}' and '{t2}' with a similarity of {ratio}%")