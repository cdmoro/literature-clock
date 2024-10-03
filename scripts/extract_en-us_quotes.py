import pandas as pd

def process_csv(input_file, output_file):
    df = pd.read_csv(input_file)

    df['Quote'] = df.apply(lambda row: row['Quote'].replace(row['Quote time'], f'<-<-<-<{row["Quote time"]}>->->->', 1), axis=1)

    df[["Quote"]].to_csv(output_file, index=False, header=False)

input_file = './quotes/quotes.en-US.csv'
output_file = './scripts/quotes.en-US.extracted.csv'

process_csv(input_file, output_file)