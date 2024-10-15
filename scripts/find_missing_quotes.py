import os
import pandas as pd
import re

# Path to the folder containing the CSV files
folder_path = 'quotes'
# Name of the column to analyze
column_name = 'Quote'
# Output file to store the results
output_file = 'scripts/quote_inconsistencies_' + column_name.replace(" ", "_") +'.csv'

# Curved and angular quotes
single_quote_open = '‘'
single_quote_close = '’'
double_quote_open = '“'
double_quote_close = '”'
angular_quote_open = '«'
angular_quote_close = '»'

# Regex patterns to match single quote close not used in contractions
single_quote_close_pattern = re.compile(rf"(?<!\w){re.escape(single_quote_close)}(?!\w)")

def check_quotes(text):
    """ Returns the count of open and close quotes for single, double, and angular quotes """
    # Count single open quotes (no need to exclude contractions)
    single_quotes_open_count = 0
    # single_quotes_open_count = text.count(single_quote_open)
    
    # Count single close quotes, ignoring those used in contractions
    # single_quotes_close_count = len(single_quote_close_pattern.findall(text))
    single_quotes_close_count = 0
    
    # Count double and angular quotes (no need for special handling)
    double_quotes_open_count = text.count(double_quote_open)
    double_quotes_close_count = text.count(double_quote_close)
    angular_quotes_open_count = text.count(angular_quote_open)
    angular_quotes_close_count = text.count(angular_quote_close)
    
    return (single_quotes_open_count, single_quotes_close_count, 
            double_quotes_open_count, double_quotes_close_count, 
            angular_quotes_open_count, angular_quotes_close_count)

# List to store the results
results = []

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
                
                # Append the result for this row if there is any inconsistency
                if (single_open != single_close or double_open != double_close or 
                    angular_open != angular_close):
                    results.append({
                        'File': filename,
                        'Row': idx + 2,  # The idx already corresponds to the correct row since headers are managed by pandas
                        # 'Single Quotes Opened': single_open,
                        # 'Single Quotes Closed': single_close,
                        'Double Quotes Opened': double_open,
                        'Double Quotes Closed': double_close,
                        'Angular Quotes Opened': angular_open,
                        'Angular Quotes Closed': angular_close
                    })
        else:
            print(f"File {filename}: Column '{column_name}' not found.")

# Convert results to a DataFrame and save as a CSV
if results:
    results_df = pd.DataFrame(results)
    results_df.to_csv(output_file, index=False)
    print(f"Results saved to {output_file}")
else:
    print("No inconsistencies found.")
