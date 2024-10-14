import pandas as pd
from fuzzywuzzy import fuzz
import sys

# Check if the user provided the CSV file path
if len(sys.argv) < 2:
    print("Usage: python find_similar_titles.py en-US")
    sys.exit(1)

# Get the CSV file path from the command-line argument
locale = sys.argv[1]

# Load the CSV file
df = pd.read_csv("quotes/quotes." + locale + ".csv")

# Define a similarity threshold (adjustable)
threshold = 85

# Group the data by authors
grouped_by_author = df.groupby('Author')

# Compare titles within each author group
similar_titles = []

for author, group in grouped_by_author:
    book_titles = group['Title'].unique()
    
    for i, title1 in enumerate(book_titles):
        for title2 in book_titles[i+1:]:
            similarity_ratio = fuzz.ratio(title1, title2)
            if similarity_ratio > threshold:
                similar_titles.append((author, title1, title2, similarity_ratio))

# Display the results
for author, t1, t2, ratio in similar_titles:
    print(f"Author: {author} - Similar titles: '{t1}' and '{t2}' with a similarity of {ratio}%")