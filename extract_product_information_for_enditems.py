import pandas as pd
import json
from collections import Counter

# Read the CSV file
def read_csv_data(file_path):
    try:
        df = pd.read_csv(file_path)
        print(f"Successfully read CSV file with {len(df)} rows")
        return df
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return None

# Read the JSON file
def read_json_data(file_path):
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
        print(f"Successfully read JSON file")
        return data
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

# Create a mapping of products from JSON data
def create_product_mapping(json_data):
    product_map = {}
    base_image_url = "https://cdn.klauke.com/resources/images/"
    
    products_with_images = 0
    total_products = len(json_data.get('products', []))
    
    for product in json_data.get('products', []):
        part_number = product.get('salsify:id')
        if part_number:
            primary_image_key = product.get('Image Primary', {}).get('en-GB', '')
            if primary_image_key.startswith('Klauke_'):
                primary_image_key = primary_image_key[len('Klauke_'):]
            if primary_image_key:
                products_with_images += 1
            product_map[part_number] = {
                'primary_image': f"{base_image_url}{primary_image_key}" if primary_image_key else ''
            }
    
    print(f"\nSalsify Data Statistics:")
    print(f"Total products in Salsify: {total_products}")
    print(f"Products with images: {products_with_images}")
    print(f"Products without images: {total_products - products_with_images}")
    
    return product_map

# Process data and create CSV
def create_output_csv(connectors_df, product_map, output_file):
    # Add image URL column
    connectors_df['Image URL'] = connectors_df['Part No.'].map(lambda part_no: product_map.get(part_no, {}).get('primary_image', ''))
    
    # Calculate statistics
    total_parts = len(connectors_df)
    parts_with_images = connectors_df['Image URL'].notna().sum()
    parts_with_images_not_empty = (connectors_df['Image URL'] != '').sum()
    
    # Get list of unmatched parts
    unmatched_parts = connectors_df[connectors_df['Image URL'] == '']['Part No.'].tolist()
    
    # Save to new CSV file
    connectors_df.to_csv(output_file, index=False)
    
    print(f"\nConnector Mapping Statistics:")
    print(f"Total parts in mapping: {total_parts}")
    print(f"Parts with images: {parts_with_images_not_empty}")
    print(f"Parts without images: {total_parts - parts_with_images_not_empty}")
    
    if unmatched_parts:
        print(f"\nFirst 10 unmatched part numbers:")
        for part in unmatched_parts[:10]:
            print(f"- {part}")
        if len(unmatched_parts) > 10:
            print(f"... and {len(unmatched_parts) - 10} more")
    
    # Group unmatched parts by series (first two characters)
    if unmatched_parts:
        series_count = Counter(part[:2] for part in unmatched_parts)
        print("\nUnmatched parts by series:")
        for series, count in series_count.most_common():
            print(f"Series {series}: {count} parts")
    
    print(f"\nOutput saved to {output_file}")

def main():
    print("Starting processing...")
    
    # File paths
    connectors_file = 'documentation/Connectors_compatible_tools.csv'
    json_file = 'data/salsify_data_prod.json'
    output_file = 'documentation/Connectors_compatible_tools_with_images.csv'
    
    # Read input files
    print("\nReading input files...")
    connectors_data = read_csv_data(connectors_file)
    json_data = read_json_data(json_file)
    
    if connectors_data is not None and json_data is not None:
        print("\nCreating product mapping...")
        # Create product mapping from JSON
        product_map = create_product_mapping(json_data)
        
        print("\nProcessing output CSV...")
        # Create output CSV
        create_output_csv(connectors_data, product_map, output_file)
        
        print("\nProcessing complete!")
    else:
        print("Failed to process files")

if __name__ == "__main__":
    main()