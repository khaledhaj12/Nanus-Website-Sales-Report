#!/usr/bin/env python3

import pandas as pd
import numpy as np
from collections import defaultdict

def analyze_cleaned_csv():
    """Analyze the cleaned CSV with proper WooCommerce refund filtering"""
    
    # Read the cleaned CSV data
    df = pd.read_csv('attached_assets/cleaned-Mayorders-2025-06-03-17-44-11.csv')
    
    print("=== CLEANED CSV ANALYSIS (Refunded Status + Total(-Refund) ≠ 0) ===\n")
    
    # Clean and prepare data
    df['Total Amount'] = pd.to_numeric(df['Total Amount'], errors='coerce')
    df['Total (- Refund)'] = pd.to_numeric(df['Total (- Refund)'], errors='coerce')
    df['Refund Amount'] = pd.to_numeric(df['Refund Amount'], errors='coerce')
    
    # Remove rows with no location (empty rows)
    df = df.dropna(subset=['Location'])
    
    # Location mapping to match platform
    location_mapping = {
        '7 Court St, Binghamton, NY': '7 Court St, Binghamton, NY',
        '7434 Ogontz Ave, Philadelphia, PA': '7434 Ogontz Ave, Philadelphia, PA', 
        '314 S High St, West Chester, PA': '314 S High St, West Chester, PA',
        '2210 Cottman Ave, Philadelphia, PA': '2210 Cottman Ave, Philadelphia, PA',
        '6151 Ridge Ave, Philadelphia, PA': '6151 Ridge Ave, Philadelphia, PA',
        '4501 N Broad St, Philadelphia, PA': '4501 N Broad St, Philadelphia, PA',
        '1947 Street Rd, Bensalem, PA': '1947 Street Rd, Bensalem, PA',
        'Drexel University 3301 Market St, Philadelphia': 'Drexel University 3301 Market St, Philadelphia',
        '2100 Mt Ephraim Ave, Oaklyn, NJ': '2100 Mt Ephraim Ave, Oaklyn, NJ'
    }
    
    # Filter to known locations only
    df = df[df['Location'].isin(location_mapping.keys())]
    df['Location'] = df['Location'].map(location_mapping)
    
    # Separate processing and refunded orders
    processing_orders = df[df['Status'] == 'Processing'].copy()
    refunded_orders = df[df['Status'] == 'Refunded'].copy()
    
    print("Total rows in CSV:", len(df))
    print("Processing orders:", len(processing_orders))
    print("Refunded orders:", len(refunded_orders))
    print()
    
    # Platform comparison data (from previous analysis)
    platform_data = {
        '7 Court St, Binghamton, NY': {
            'processing_sales': 5296.37, 'processing_orders': 392,
            'refunds': 56.10, 'refunded_orders': 2
        },
        '7434 Ogontz Ave, Philadelphia, PA': {
            'processing_sales': 1046.43, 'processing_orders': 58,
            'refunds': 13.74, 'refunded_orders': 1
        },
        '314 S High St, West Chester, PA': {
            'processing_sales': 2945.89, 'processing_orders': 186,
            'refunds': 36.85, 'refunded_orders': 1
        },
        '2210 Cottman Ave, Philadelphia, PA': {
            'processing_sales': 2718.12, 'processing_orders': 179,
            'refunds': 55.51, 'refunded_orders': 2
        },
        '6151 Ridge Ave, Philadelphia, PA': {
            'processing_sales': 3240.46, 'processing_orders': 216,
            'refunds': 51.61, 'refunded_orders': 2
        },
        '4501 N Broad St, Philadelphia, PA': {
            'processing_sales': 532.10, 'processing_orders': 30,
            'refunds': 42.37, 'refunded_orders': 1
        },
        '1947 Street Rd, Bensalem, PA': {
            'processing_sales': 454.07, 'processing_orders': 28,
            'refunds': 0.00, 'refunded_orders': 0
        },
        'Drexel University 3301 Market St, Philadelphia': {
            'processing_sales': 78.03, 'processing_orders': 5,
            'refunds': 0.00, 'refunded_orders': 0
        },
        '2100 Mt Ephraim Ave, Oaklyn, NJ': {
            'processing_sales': 10575.87, 'processing_orders': 643,
            'refunds': 0.00, 'refunded_orders': 0
        }
    }
    
    # Analyze by location
    results = defaultdict(dict)
    
    for location in location_mapping.values():
        location_processing = processing_orders[processing_orders['Location'] == location]
        location_refunded = refunded_orders[refunded_orders['Location'] == location]
        
        # Processing orders analysis
        processing_sales = location_processing['Total Amount'].sum()
        processing_count = len(location_processing)
        
        # Refunded orders analysis - use absolute value of Total (- Refund) for refund amount
        refund_amount = abs(location_refunded['Total (- Refund)'].sum())
        refunded_count = len(location_refunded)
        
        results[location] = {
            'csv_processing_sales': processing_sales,
            'csv_processing_orders': processing_count,
            'csv_refunds': refund_amount,
            'csv_refunded_orders': refunded_count,
            'platform_processing_sales': platform_data[location]['processing_sales'],
            'platform_processing_orders': platform_data[location]['processing_orders'],
            'platform_refunds': platform_data[location]['refunds'],
            'platform_refunded_orders': platform_data[location]['refunded_orders']
        }
    
    # Print detailed comparison
    print("LOCATION-BY-LOCATION COMPARISON:")
    print("=" * 80)
    
    total_discrepancies = 0
    
    for location, data in results.items():
        print(f"\n📍 {location}")
        print("-" * 60)
        
        # Processing Sales
        sales_diff = abs(data['csv_processing_sales'] - data['platform_processing_sales'])
        sales_match = sales_diff < 0.01
        print(f"Processing Sales:")
        print(f"  CSV: ${data['csv_processing_sales']:.2f}")
        print(f"  Platform: ${data['platform_processing_sales']:.2f}")
        print(f"  Match: {'✅' if sales_match else '❌'} (diff: ${sales_diff:.2f})")
        
        # Processing Orders
        orders_match = data['csv_processing_orders'] == data['platform_processing_orders']
        print(f"Processing Orders:")
        print(f"  CSV: {data['csv_processing_orders']}")
        print(f"  Platform: {data['platform_processing_orders']}")
        print(f"  Match: {'✅' if orders_match else '❌'}")
        
        # Refunds
        refund_diff = abs(data['csv_refunds'] - data['platform_refunds'])
        refund_match = refund_diff < 0.01
        print(f"Refunds:")
        print(f"  CSV: ${data['csv_refunds']:.2f}")
        print(f"  Platform: ${data['platform_refunds']:.2f}")
        print(f"  Match: {'✅' if refund_match else '❌'} (diff: ${refund_diff:.2f})")
        
        # Refunded Orders
        refunded_orders_match = data['csv_refunded_orders'] == data['platform_refunded_orders']
        print(f"Refunded Orders:")
        print(f"  CSV: {data['csv_refunded_orders']}")
        print(f"  Platform: {data['platform_refunded_orders']}")
        print(f"  Match: {'✅' if refunded_orders_match else '❌'}")
        
        if not (sales_match and orders_match and refund_match and refunded_orders_match):
            total_discrepancies += 1
    
    # Calculate totals
    csv_total_processing_sales = sum(data['csv_processing_sales'] for data in results.values())
    csv_total_processing_orders = sum(data['csv_processing_orders'] for data in results.values())
    csv_total_refunds = sum(data['csv_refunds'] for data in results.values())
    csv_total_refunded_orders = sum(data['csv_refunded_orders'] for data in results.values())
    
    platform_total_processing_sales = sum(data['platform_processing_sales'] for data in results.values())
    platform_total_processing_orders = sum(data['platform_processing_orders'] for data in results.values())
    platform_total_refunds = sum(data['platform_refunds'] for data in results.values())
    platform_total_refunded_orders = sum(data['platform_refunded_orders'] for data in results.values())
    
    # Summary
    print(f"\n{'='*80}")
    print("TOTALS COMPARISON:")
    print(f"Processing Sales:")
    print(f"  CSV Total: ${csv_total_processing_sales:.2f}")
    print(f"  Platform Total: ${platform_total_processing_sales:.2f}")
    print(f"  Difference: ${abs(csv_total_processing_sales - platform_total_processing_sales):.2f}")
    
    print(f"Processing Orders:")
    print(f"  CSV Total: {csv_total_processing_orders}")
    print(f"  Platform Total: {platform_total_processing_orders}")
    print(f"  Difference: {abs(csv_total_processing_orders - platform_total_processing_orders)}")
    
    print(f"Refunds:")
    print(f"  CSV Total: ${csv_total_refunds:.2f}")
    print(f"  Platform Total: ${platform_total_refunds:.2f}")
    print(f"  Difference: ${abs(csv_total_refunds - platform_total_refunds):.2f}")
    
    print(f"Refunded Orders:")
    print(f"  CSV Total: {csv_total_refunded_orders}")
    print(f"  Platform Total: {platform_total_refunded_orders}")
    print(f"  Difference: {abs(csv_total_refunded_orders - platform_total_refunded_orders)}")
    
    print(f"\n{'='*80}")
    print("FINAL SUMMARY:")
    print(f"Total locations analyzed: {len(results)}")
    print(f"Locations with discrepancies: {total_discrepancies}")
    print(f"Perfect matches: {len(results) - total_discrepancies}")
    
    if total_discrepancies == 0:
        print("\n🎉 PERFECT MATCH! CSV and Platform data align completely.")
    else:
        print(f"\n⚠️  {total_discrepancies} locations still have discrepancies.")
    
    # Show sample refund entries to understand the data
    print(f"\n{'='*80}")
    print("SAMPLE REFUNDED ENTRIES:")
    if len(refunded_orders) > 0:
        print(refunded_orders[['Order ID', 'Location', 'Status', 'Total Amount', 'Total (- Refund)', 'Refund Amount']].head(10))
    else:
        print("No refunded orders found in filtered data.")

if __name__ == "__main__":
    analyze_cleaned_csv()