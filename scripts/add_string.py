import json
import subprocess
from googletrans import Translator
from collections import OrderedDict

# Path to your JSON file
json_path = "src/strings/translations.json"

def translate_text(text, target_lang):
    translator = Translator()
    translation = translator.translate(text, dest=target_lang)
    return translation.text

def add_and_translate_key(new_key, english_text):
    with open(json_path, "r", encoding="utf-8") as file:
        translations = json.load(file)
    
    translations["en-US"][new_key] = english_text
    for lang_code in translations:
        if lang_code != "en-US":
            translations[lang_code][new_key] = translate_text(english_text, lang_code[:2])  # Google Translate uses 2-letter codes
    
    sorted_translations = {
        lang: dict(OrderedDict(sorted(trans.items())))
        for lang, trans in translations.items()
    }
    
    with open(json_path, "w", encoding="utf-8") as file:
        json.dump(sorted_translations, file, ensure_ascii=False, indent=2)

    subprocess.run(["python", "scripts/generate_strings_type.py"])

# Direct execution at the root level
new_key = input("Key: ").lower().replace(" ", "_")
english_text = input("Content: ")
add_and_translate_key(new_key, english_text)
