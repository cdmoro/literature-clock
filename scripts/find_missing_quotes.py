import os
import pandas as pd
import re
from collections import defaultdict

# Path to the folder containing the CSV files
folder_path = 'quotes'
# Name of the column to analyze
column_name = 'Quote'

# Curved and angular quotes
single_quote_open = '‘'
single_quote_close = '’'
double_quote_open = '“'
double_quote_close = '”'
angular_quote_open = '«'
angular_quote_close = '»'

# Regex to match valid contractions (between letters) to avoid false positives
valid_contraction_pattern = re.compile(
    rf"[\wáéíóúñüàâæçèéêëîïôœùûüÿãâçêíõú]{re.escape(single_quote_close)}[\wáéíóúñüàâæçèéêëîïôœùûüÿãâçêíõú]|po{re.escape(single_quote_close)}|E{re.escape(single_quote_close)} |e{re.escape(single_quote_close)} |all{re.escape(single_quote_close)}l{re.escape(single_quote_close)}|l{re.escape(single_quote_close)}l{re.escape(single_quote_close)}una|dell{re.escape(single_quote_close)}l{re.escape(single_quote_close)}una"
)

def check_quotes(text):
    """ Returns the count of open and close quotes for single, double, and angular quotes """
    # Count single open quotes
    single_quotes_open_count = text.count(single_quote_open)
    
    # Count single close quotes, ignoring valid contractions
    # We'll remove the valid contractions from the text first, then count the remaining single close quotes
    cleaned_text = re.sub(valid_contraction_pattern, '', text)
    single_quotes_close_count = cleaned_text.count(single_quote_close)
    
    # Count double and angular quotes
    double_quotes_open_count = text.count(double_quote_open)
    double_quotes_close_count = text.count(double_quote_close)
    angular_quotes_open_count = text.count(angular_quote_open)
    angular_quotes_close_count = text.count(angular_quote_close)
    
    
    return (single_quotes_open_count, single_quotes_close_count, 
            double_quotes_open_count, double_quotes_close_count, 
            angular_quotes_open_count, angular_quotes_close_count)

# Dictionary to group results by row index
grouped_results = defaultdict(list)

# Iterate over all CSV files in the folder
for filename in os.listdir(folder_path):
    if filename.endswith('.csv'):
        file_path = os.path.join(folder_path, filename)
        
        # Load the CSV with headers
        df = pd.read_csv(file_path)
        
        # Check if the specified column exists in the CSV
        if column_name in df.columns:
            for idx, row in df.iterrows():
                text = str(row[column_name])
                single_open, single_close, double_open, double_close, angular_open, angular_close = check_quotes(text)
                
                # If any inconsistencies are found, store them in the grouped_results dictionary
                if (single_open != single_close or double_open != double_close or 
                    angular_open != angular_close):
                    grouped_results[idx + 2].append({
                        'file': file_path,
                        'single': (single_open, single_close),
                        'double': (double_open, double_close),
                        'angular': (angular_open, angular_close)
                    })
        else:
            print(f"File {filename}: Column '{column_name}' not found.")

# Print grouped results
for iteration, (row, issues) in enumerate(grouped_results.items(), start=1):
    for issue in issues:
        print(f"{iteration}. {issue['file']}:{row}\t‘’ [{issue['single'][0]}:{issue['single'][1]}]  “” [{issue['double'][0]}:{issue['double'][1]}]  «» [{issue['angular'][0]}:{issue['angular'][1]}]\tquotes\\quotes.en-US.csv:{row}")
        print(f"  quotes\\quotes.es-ES.csv:{row}\tquotes\\quotes.fr-FR.csv:{row}\tquotes\\quotes.it-IT.csv:{row}\tquotes\\quotes.pt-BR.csv:{row}\tquotes\\quotes.de-DE.csv:{row}")
    print("-" * 80)
