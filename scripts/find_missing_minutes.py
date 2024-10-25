import os

# Directory where the JSON files are located
directory = 'public/times/en-US'  # Replace with your actual path

# Generate a list of all possible minutes of the day
all_minutes = [f"{h:02d}_{m:02d}.json" for h in range(24) for m in range(60)]

# Get a list of files present in the directory
files_in_directory = os.listdir(directory)

# Compare the files present with the expected files
missing_minutes = [minute for minute in all_minutes if minute not in files_in_directory]

# Print missing minutes
if missing_minutes:
    print("Missing minutes:")
    for minute in missing_minutes:
        print(minute)
else:
    print("No missing minutes.")