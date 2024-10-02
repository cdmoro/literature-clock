import pandas as pd

# Función para procesar el archivo CSV
def process_csv(input_file, output_file):
    # Cargar el CSV en un DataFrame
    df = pd.read_csv(input_file)

    # Reemplazar el valor de la segunda columna en la tercera columna con el formato especificado
    df['Quote'] = df.apply(lambda row: row['Quote'].replace(row['Quote time'], f'<-<-<-<{row["Quote time"]}>->->->', 1), axis=1)

    # Guardar la tercera columna en un nuevo archivo CSV
    df[["Quote"]].to_csv(output_file, index=False, header=False)

# Ejemplo de uso (reemplaza con las rutas de tus archivos)
input_file = 'quotes.en-US.csv'
output_file = 'output.csv'

# Procesar el archivo
process_csv(input_file, output_file)