import pandas as pd
import json

# Read the Excel file
def read_excel_data(file_path):
    try:
        df = pd.read_excel(file_path)
        return df
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return None

# Read the JSON file
def read_json_data(file_path):
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
        return data
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return None

# Create a mapping of products from JSON data
def create_product_mapping(json_data):
    product_map = {}
    base_image_url = "https://cdn.klauke.com/resources/images/"
    
    for product in json_data.get('products', []):
        salsify_id = product.get('salsify:id')
        if salsify_id:
            primary_image_key = product.get('Image Primary', {}).get('en-GB', '')
            if primary_image_key.startswith('Klauke_'):
                primary_image_key = primary_image_key[len('Klauke_'):]
            product_map[salsify_id] = {
                'product_url': product.get('URL Product', {}).get('en-GB', ''),
                'primary_image': f"{base_image_url}{primary_image_key}" if primary_image_key else '',
                'product_name': product.get('Product Name', {}).get('en-GB', '')
            }
    return product_map

# Process data and create CSV
def create_output_csv(excel_df, product_map, output_file):
    # Create output dataframe
    output_data = {
        'SKU': [],
        'Tool Series': [],
        'Product URL': [],
        'Primary Image': [],
        'Product Name': []
    }
    
    # List to store unmatched SKUs
    unmatched_skus = []
    
    # Process each row in Excel
    for _, row in excel_df.iterrows():
        sku = str(row['SKU'])  # Ensure SKU is treated as string
        tool_series = row.get('Tool Series', '')
        
        # Find matching product in JSON data
        product_info = product_map.get(sku, {})
        
        if not product_info:
            unmatched_skus.append(sku)
        
        # Add data to output
        output_data['SKU'].append(sku)
        output_data['Tool Series'].append(tool_series)
        output_data['Product URL'].append(product_info.get('product_url', ''))
        output_data['Primary Image'].append(product_info.get('primary_image', ''))
        output_data['Product Name'].append(product_info.get('product_name', ''))
    
    # Create and save output DataFrame
    output_df = pd.DataFrame(output_data)
    output_df.to_csv(output_file, index=False)
    print(f"Output saved to {output_file}")
    
    # Print unmatched SKUs
    if unmatched_skus:
        print("Unmatched SKUs:")
        for sku in unmatched_skus:
            print(sku)
    else:
        print("All SKUs matched successfully.")

def main():
    # File paths
    excel_file = 'documentation/KlaukeConnetorTools.xlsx'
    json_file = 'data/salsify_data_prod.json'
    output_file = 'data/klauke_products_with_details.csv'
    
    # Read input files
    excel_data = read_excel_data(excel_file)
    json_data = read_json_data(json_file)
    
    if excel_data is not None and json_data is not None:
        # Create product mapping from JSON
        product_map = create_product_mapping(json_data)
        
        # Create output CSV
        create_output_csv(excel_data, product_map, output_file)
    else:
        print("Failed to process files")

if __name__ == "__main__":
    main()