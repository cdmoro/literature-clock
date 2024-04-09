import os
import pandas as pd
import json

# Number of minutes in a day
minutes = 1440

# Define the folder where CSV files are located
quotes_path = 'quotes/'
output_path = 'times/'

# List all files in the folder
file_list = os.listdir(quotes_path)

print("Starting processing quotes...\n")

# Iterate over each CSV file
for file_name in file_list:
    if file_name.endswith('.csv'):
        # Extract the language from the file name
        language = file_name.split('.')[1]

        # Read the CSV file
        df = pd.read_csv(os.path.join(quotes_path, file_name))

        # Group the data by the 'Time' column
        groupedByTime = df.groupby('Time')

        # Create a folder for the language if it does not exist
        lang_folder = os.path.join(output_path, language)
        if not os.path.exists(lang_folder):
            os.makedirs(lang_folder)

        print(f"Processing {file_name}...")

        # Group by the 'Time' column and create JSON files for each group
        for key, group in groupedByTime:
            # Convert the group DataFrame to a list of dictionaries
            data = []
            for index, row in group.iterrows():
                # Split the quote based on Quote time
                quote_parts = row['Quote'].split(str(row['Quote time']), 1)

                if len(quote_parts) == 1:
                    print(f"Split error: '{row['Quote time']}' not found in {row['Time']}")
                    quote_parts.append('');

                quote_first = quote_parts[0]
                quote_last = quote_parts[1]

                # Construct the data dictionary
                entry = {
                    'time': row['Time'],
                    'quote_first': quote_first,
                    'quote_last': quote_last,
                    'quote_time_case': row['Quote time'],
                    'quote_raw': row['Quote'],
                    'title': row['Title'],
                    'author': row['Author'],
                    'sfw': row['SFW']
                }
                data.append(entry)

            # Create the JSON file name
            time_filename = os.path.join(output_path, language, f'{key.replace(":", "_")}.json')

            # Write the data to the JSON file
            with open(time_filename, 'w') as json_file:
                json.dump(data, json_file, indent=4, ensure_ascii=False)

        # Number of hours with quotes
        times_with_quote = groupedByTime['Time'].nunique().sum()

        # Statistics for the 5 times with the least quotes
        bottom_time_quotes = groupedByTime.size().nsmallest(5)

        # Statistics for the 5 times with the most quotes
        top_time_quotes = groupedByTime.size().nlargest(5)

        # Statistics for the top 5 authors with the most quotes
        top_author_quotes = df.groupby('Author').size().nlargest(5)
        
        statistics = {
            'times_with_quotes': times_with_quote,
            'times_without_quotes': minutes - times_with_quote,
            'total': minutes,
            'progress': round((times_with_quote * 100) / minutes, 2),
            'top_author_quotes': top_author_quotes.to_dict(),
            'bottom_time_quotes': bottom_time_quotes.to_dict(),
            'top_time_quotes': top_time_quotes.to_dict()
        }

        print(f"- {times_with_quote} files created in {os.path.join(output_path, language)}\n")

        # Create the JSON file name for statistics
        statistics_filename = os.path.join(output_path, language, 'statistics.json')
        
        with open(statistics_filename, 'w') as json_file:
            json.dump(statistics, json_file, indent=4, default=int, ensure_ascii=False)        

print("Processing finished.")