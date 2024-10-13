import pandas as pd
from fuzzywuzzy import fuzz
import sys

# Check if the user provided the CSV file path
if len(sys.argv) < 2:
    print("Usage: python script.py /path/to/your/file.csv")
    sys.exit(1)

# Get the CSV file path from the command-line argument
csv_file = sys.argv[1]

# Load the CSV file
df = pd.read_csv(csv_file)

# Define a similarity threshold (adjustable)
threshold = 85

# Get the unique book titles
book_titles = df['book_title'].unique()

# Compare titles
similar_titles = []

for i, title1 in enumerate(book_titles):
    for title2 in book_titles[i+1:]:
        similarity_ratio = fuzz.ratio(title1, title2)
        if similarity_ratio > threshold:
            similar_titles.append((title1, title2, similarity_ratio))

# Display the results
for t1, t2, ratio in similar_titles:
    print(f"Similar titles: '{t1}' and '{t2}' with a similarity of {ratio}%")