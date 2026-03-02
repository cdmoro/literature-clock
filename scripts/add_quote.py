import csv
import os
from googletrans import Translator

# Initialize the translator
translator = Translator()

# Available language codes
languages = ["en-US", "es-ES", "pt-PT", "fr-FR", "it-IT", "de-DE"]

# Path to the folder where CSV files are stored
folder_path = "quotes"


# Function to generate the ID based on the time and existing entries
def generate_id(time, lang_code):
    file_name = f"quotes.{lang_code}.csv"
    file_path = os.path.join(folder_path, file_name)

    # Initialize the count for the current time
    count = 0
    time_without_colon = time.replace(":", "")

    # Check how many entries exist with the same time
    if os.path.exists(file_path):
        with open(file_path, mode="r", newline="", encoding="utf-8") as file:
            reader = csv.reader(file, delimiter="|")
            for row in reader:
                if (
                    len(row) > 0 and row[0] == time
                ):  # Assuming the time is in the first column
                    count += 1

    # Create the ID in the format HHMM-XXX
    return f"{time_without_colon}-{count:03}"


def insert_quote_sorted(file_path, new_row):
    rows = []

    with open(file_path, mode="r", encoding="utf-8") as file:
        reader = csv.reader(file, delimiter="|")
        rows = list(reader)

    header = rows[0]
    data_rows = rows[1:]

    data_rows.append(new_row)

    data_rows.sort(
        key=lambda row: (int(row[1].split("-")[0]), int(row[1].split("-")[1]))
    )

    with open(file_path, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file, delimiter="|")
        writer.writerow(header)
        writer.writerows(data_rows)


# Function to add the translated quote and title to the CSV files
def add_quote_to_csv(time, quote, title, author, language_code, sfw):
    for lang_code in languages:
        print(f"Processing language: {lang_code}")
        # Translate the quote and title if the language is not the original
        if lang_code != language_code:
            translated_quote = translator.translate(
                quote, src=language_code.split("-")[0], dest=lang_code.split("-")[0]
            ).text
            translated_title = translator.translate(
                title, src=language_code.split("-")[0], dest=lang_code.split("-")[0]
            ).text
        else:
            translated_quote = quote
            translated_title = title

        # Generate the ID for the new quote
        quote_id = generate_id(time, lang_code)

        # Open the corresponding CSV file and append the translated quote and title
        file_name = f"quotes.{lang_code}.csv"
        file_path = os.path.join(folder_path, file_name)

        new_row = [time, quote_id, "*", translated_quote, translated_title, author, sfw]
        insert_quote_sorted(file_path, new_row)


# Function to ask the user for quote details
def input_quote():
    time = input("Time (HH:MM): ")
    quote = input("Quote: ")
    title = input("Book: ")
    author = input("Author: ")

    print("Is this quote Safe for Work (y/N)?")
    sfw_input = input().strip().upper() or "N"
    sfw = "sfw" if sfw_input == "Y" else "nsfw"

    print("Select the original language of the quote:")
    for i, code in enumerate(languages):
        print(f"{i + 1}. {code}")
    language_index = int(input("Language number: ")) - 1

    if language_index < 0 or language_index >= len(languages):
        print("Invalid language.")
        return

    language_code = languages[language_index]
    add_quote_to_csv(time, quote, title, author, language_code, sfw)


# Run the script
input_quote()
