import json

with open('src/strings/translations.json', 'r', encoding='utf-8') as file:
    languages = json.load(file)

def check_keys_consistency(languages):
    base_keys = set(languages[next(iter(languages))].keys())

    for lang, keys in languages.items():
        current_keys = set(keys.keys())
        if base_keys != current_keys:
            missing_in_base = base_keys - current_keys
            missing_in_current = current_keys - base_keys
            print(f"Discrepancies found in {lang}:")
            if missing_in_base:
                print(f" - Missing keys in {lang}: {missing_in_base}")
            if missing_in_current:
                print(f" - Extra keys in {lang}: {missing_in_current}")
        else:
            print(f"All keys match in {lang}")


def generate_typescript_type(languages):
    subkeys = languages[next(iter(languages))].keys()

    ts_type = "export type Translations = {\n"
    for key in subkeys:
        ts_type += f"  {key}: string;\n"
    ts_type += "};"

    with open('src/strings/types.ts', 'w', encoding='utf-8') as ts_file:
        ts_file.write(ts_type)

    print("TypeScript type generated successfully in 'src/strings/types.ts'.")

check_keys_consistency(languages)
generate_typescript_type(languages)