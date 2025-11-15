import pandas as pd
import os

# Path to the folder containing the CSV files
folder_path = 'quotes'

# Function to generate the ID based on the first column
def generate_id(df):
    counter = {}
    ids = []
    
    for time_value in df.iloc[:, 0]:  # Assumes the first column is the time
        # Convert the time (format 17:05) to 1705
        time_str = time_value.replace(":", "")
        
        if time_str not in counter:
            counter[time_str] = 0
        else:
            counter[time_str] += 1
        
        # Generate the ID with the three additional digits
        new_id = f"{time_str}-{counter[time_str]:03d}"
        ids.append(new_id)
    
    # Add the new 'id' column to the DataFrame
    df['Id'] = ids
    
    # Rearrange the DataFrame to place 'Id' after the first column
    cols = list(df.columns)
    cols.insert(1, cols.pop(cols.index('Id')))  # Move 'Id' to the second position
    df = df[cols]
    
    return df

# Process all CSV files in the folder
for file_name in os.listdir(folder_path):
    if file_name.endswith('.csv'):
        file_path = os.path.join(folder_path, file_name)
        df = pd.read_csv(file_path, sep="|")
        
        # Generate the 'Id' column
        df_with_id = generate_id(df)
        
        # Save the CSV with the new column
        df_with_id.to_csv(file_path, index=False)

print("Column 'Id' added successfully.")
