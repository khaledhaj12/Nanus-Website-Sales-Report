import pandas as pd
import numpy as np

# Read the CSV file
df = pd.read_csv('attached_assets/Mayorders-2025-06-03-17-44-11.csv')

print("=== COMPREHENSIVE CSV vs PLATFORM ANALYSIS ===")

# Clean the data
df_clean = df.copy()
df_clean['Total Amount'] = pd.to_numeric(df_clean['Total Amount'], errors='coerce')
df_clean['Refund Amount'] = pd.to_numeric(df_clean['Refund Amount'], errors='coerce').fillna(0)

# Get unique locations
unique_locations = df_clean['Location'].unique()
print(f"Locations found in CSV: {len(unique_locations)}")
for i, location in enumerate(unique_locations, 1):
    print(f"  {i}. {location}")

print("\n" + "="*80)

# Analyze each location
total_csv_sales = 0
total_csv_orders = 0
total_csv_refunds = 0

for location in unique_locations:
    # Handle NaN values
    if pd.isna(location):
        location_name = "UNKNOWN LOCATION"
        print(f"\n=== {location_name} ANALYSIS ===")
        location_orders = df_clean[df_clean['Location'].isna()]
    else:
        location_name = location.upper()
        print(f"\n=== {location_name} ANALYSIS ===")
        location_orders = df_clean[df_clean['Location'] == location]
    
    # Calculate metrics
    total_orders = len(location_orders)
    processing_orders = len(location_orders[location_orders['Status'] == 'Processing'])
    refunded_orders = len(location_orders[location_orders['Status'] == 'Refunded'])
    
    # Calculate sales (processing only - excluding refunded from sales)
    processing_sales = location_orders[location_orders['Status'] == 'Processing']['Total Amount'].sum()
    refund_amount = location_orders[location_orders['Status'] == 'Refunded']['Total Amount'].sum()
    
    # Status breakdown
    status_breakdown = location_orders['Status'].value_counts()
    
    print(f"Total Orders: {total_orders}")
    print(f"Processing Orders: {processing_orders}")
    print(f"Refunded Orders: {refunded_orders}")
    print(f"Processing Sales: ${processing_sales:.2f}")
    print(f"Refund Amount: ${refund_amount:.2f}")
    
    print(f"Status Breakdown:")
    for status, count in status_breakdown.items():
        print(f"  {status}: {count}")
    
    # Add to totals
    total_csv_sales += processing_sales
    total_csv_orders += total_orders
    total_csv_refunds += refund_amount
    
    # Show order ID range for verification
    order_ids = location_orders['Order ID'].astype(str)
    if len(order_ids) > 0:
        print(f"Order ID Range: {order_ids.min()} to {order_ids.max()}")
        print(f"Sample Order IDs: {list(order_ids.head(3))}")

print(f"\n" + "="*80)
print(f"=== TOTAL CSV SUMMARY ===")
print(f"Total Sales (Processing only): ${total_csv_sales:.2f}")
print(f"Total Orders (All statuses): {total_csv_orders}")
print(f"Total Refunds: ${total_csv_refunds:.2f}")

print(f"\n" + "="*80)
print(f"=== PLATFORM COMPARISON NEEDED ===")
print("Now we need to compare these CSV totals with platform data:")
print("1. Query platform for all locations in May 2025")
print("2. Filter by processing + refunded status")
print("3. Compare location by location")
print("4. Identify any discrepancies")