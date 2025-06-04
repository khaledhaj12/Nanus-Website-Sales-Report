#!/usr/bin/env python3
"""
Comprehensive comparison between CSV data and Platform database data
Analyzes discrepancies in May 2025 order data across all locations
"""

def main():
    print("=== PLATFORM vs CSV COMPARISON ANALYSIS ===")
    print()
    
    # CSV Data from comprehensive_analysis.py
    csv_data = {
        "7 Court St, Binghamton, NY": {"orders": 204, "processing": 200, "refunded": 4, "processing_sales": 4755.64, "refund_amount": 0.00},
        "7434 Ogontz Ave, Philadelphia, PA": {"orders": 25, "processing": 23, "refunded": 2, "processing_sales": 442.64, "refund_amount": 0.00},
        "314 S High St, West Chester, PA": {"orders": 294, "processing": 292, "refunded": 2, "processing_sales": 7610.02, "refund_amount": 0.00},
        "2210 Cottman Ave, Philadelphia, PA": {"orders": 267, "processing": 263, "refunded": 4, "processing_sales": 6301.24, "refund_amount": 0.00},
        "6151 Ridge Ave, Philadelphia, PA": {"orders": 227, "processing": 223, "refunded": 4, "processing_sales": 5092.46, "refund_amount": 0.00},
        "1947 Street Rd, Bensalem, PA": {"orders": 107, "processing": 107, "refunded": 0, "processing_sales": 2475.41, "refund_amount": 0.00},
        "Unknown Location": {"orders": 151, "processing": 117, "refunded": 34, "processing_sales": 2173.17, "refund_amount": 0.00},
        "Drexel University 3301 Market St, Philadelphia": {"orders": 5, "processing": 5, "refunded": 0, "processing_sales": 92.92, "refund_amount": 0.00},
        "4501 N Broad St, Philadelphia, PA": {"orders": 33, "processing": 30, "refunded": 2, "processing_sales": 616.61, "refund_amount": 0.00},
        "2100 Mt Ephraim Ave, Oaklyn, NJ": {"orders": 24, "processing": 24, "refunded": 0, "processing_sales": 501.26, "refund_amount": 0.00}
    }
    
    # Platform Data from SQL query
    platform_data = {
        "314 S High St, West Chester, PA": {"orders": 293, "processing": 292, "refunded": 1, "processing_sales": 7610.02, "refund_amount": 36.85},
        "2210 Cottman Ave, Philadelphia, PA": {"orders": 265, "processing": 263, "refunded": 2, "processing_sales": 6301.24, "refund_amount": 55.51},
        "6151 Ridge Ave, Philadelphia, PA": {"orders": 225, "processing": 223, "refunded": 2, "processing_sales": 5092.46, "refund_amount": 51.61},
        "7 Court St, Binghamton, NY": {"orders": 202, "processing": 200, "refunded": 2, "processing_sales": 4755.64, "refund_amount": 56.10},
        "414 North Union St, Wilmington, DE": {"orders": 155, "processing": 154, "refunded": 1, "processing_sales": 3483.42, "refund_amount": 21.27},
        "1947 Street Rd, Bensalem, PA": {"orders": 107, "processing": 107, "refunded": 0, "processing_sales": 2475.41, "refund_amount": 0.00},
        "4407 Chestnut St, Philadelphia, PA": {"orders": 134, "processing": 117, "refunded": 17, "processing_sales": 2173.17, "refund_amount": 436.74},
        "4501 N Broad St, Philadelphia, PA": {"orders": 31, "processing": 30, "refunded": 1, "processing_sales": 616.61, "refund_amount": 42.37},
        "2100 Mt Ephraim Ave, Oaklyn, NJ": {"orders": 24, "processing": 24, "refunded": 0, "processing_sales": 501.26, "refund_amount": 0.00},
        "7434 Ogontz Ave, Philadelphia, PA": {"orders": 24, "processing": 23, "refunded": 1, "processing_sales": 442.64, "refund_amount": 13.74},
        "3301 Market St, Philadelphia, PA": {"orders": 11, "processing": 11, "refunded": 0, "processing_sales": 164.86, "refund_amount": 0.00},
        "Drexel University 3301 Market St, Philadelphia": {"orders": 5, "processing": 5, "refunded": 0, "processing_sales": 92.92, "refund_amount": 0.00}
    }
    
    # Create location mapping for better comparison
    location_mapping = {
        "7 Court St, Binghamton, NY": "7 Court St, Binghamton, NY",
        "7434 Ogontz Ave, Philadelphia, PA": "7434 Ogontz Ave, Philadelphia, PA", 
        "314 S High St, West Chester, PA": "314 S High St, West Chester, PA",
        "2210 Cottman Ave, Philadelphia, PA": "2210 Cottman Ave, Philadelphia, PA",
        "6151 Ridge Ave, Philadelphia, PA": "6151 Ridge Ave, Philadelphia, PA",
        "1947 Street Rd, Bensalem, PA": "1947 Street Rd, Bensalem, PA",
        "Unknown Location": "4407 Chestnut St, Philadelphia, PA",  # CSV unknown maps to platform main store
        "Drexel University 3301 Market St, Philadelphia": "Drexel University 3301 Market St, Philadelphia",
        "4501 N Broad St, Philadelphia, PA": "4501 N Broad St, Philadelphia, PA",
        "2100 Mt Ephraim Ave, Oaklyn, NJ": "2100 Mt Ephraim Ave, Oaklyn, NJ"
    }
    
    print("=== LOCATION BY LOCATION COMPARISON ===")
    print()
    
    total_discrepancies = 0
    perfect_matches = 0
    
    # Check each CSV location against platform
    for csv_location, csv_stats in csv_data.items():
        platform_location = location_mapping.get(csv_location, csv_location)
        platform_stats = platform_data.get(platform_location)
        
        print(f"📍 {csv_location}")
        if platform_location != csv_location:
            print(f"   → Maps to: {platform_location}")
        
        if platform_stats:
            # Compare key metrics
            order_diff = csv_stats["orders"] - platform_stats["orders"]
            processing_diff = csv_stats["processing"] - platform_stats["processing"]
            refund_diff = csv_stats["refunded"] - platform_stats["refunded"]
            sales_diff = csv_stats["processing_sales"] - platform_stats["processing_sales"]
            refund_amount_diff = csv_stats["refund_amount"] - platform_stats["refund_amount"]
            
            print(f"   Orders:      CSV: {csv_stats['orders']:3d} | Platform: {platform_stats['orders']:3d} | Diff: {order_diff:+3d}")
            print(f"   Processing:  CSV: {csv_stats['processing']:3d} | Platform: {platform_stats['processing']:3d} | Diff: {processing_diff:+3d}")
            print(f"   Refunded:    CSV: {csv_stats['refunded']:3d} | Platform: {platform_stats['refunded']:3d} | Diff: {refund_diff:+3d}")
            print(f"   Proc Sales:  CSV: ${csv_stats['processing_sales']:8.2f} | Platform: ${platform_stats['processing_sales']:8.2f} | Diff: ${sales_diff:+8.2f}")
            print(f"   Refund Amt:  CSV: ${csv_stats['refund_amount']:8.2f} | Platform: ${platform_stats['refund_amount']:8.2f} | Diff: ${refund_amount_diff:+8.2f}")
            
            # Check for perfect match
            if (order_diff == 0 and processing_diff == 0 and abs(sales_diff) < 0.01):
                print("   ✅ PERFECT MATCH (orders and sales)")
                perfect_matches += 1
            elif abs(sales_diff) < 0.01:
                print("   ✅ SALES MATCH (minor order count differences)")
                perfect_matches += 1
            else:
                print("   ⚠️  DISCREPANCY DETECTED")
                total_discrepancies += 1
            
        else:
            print("   ❌ NOT FOUND IN PLATFORM")
            total_discrepancies += 1
        
        print()
    
    # Check for platform locations not in CSV
    print("=== PLATFORM-ONLY LOCATIONS ===")
    csv_mapped_locations = set(location_mapping.values())
    for platform_location, platform_stats in platform_data.items():
        if platform_location not in csv_mapped_locations and platform_location not in csv_data:
            print(f"📍 {platform_location} (Platform only)")
            print(f"   Orders: {platform_stats['orders']}, Processing Sales: ${platform_stats['processing_sales']:.2f}")
            total_discrepancies += 1
    
    print()
    print("=== SUMMARY TOTALS ===")
    
    # Calculate CSV totals
    csv_total_orders = sum(stats["orders"] for stats in csv_data.values())
    csv_total_processing_sales = sum(stats["processing_sales"] for stats in csv_data.values())
    csv_total_refunds = sum(stats["refund_amount"] for stats in csv_data.values())
    
    # Calculate Platform totals  
    platform_total_orders = sum(stats["orders"] for stats in platform_data.values())
    platform_total_processing_sales = sum(stats["processing_sales"] for stats in platform_data.values())
    platform_total_refunds = sum(stats["refund_amount"] for stats in platform_data.values())
    
    print(f"CSV Total Orders:      {csv_total_orders:4d}")
    print(f"Platform Total Orders: {platform_total_orders:4d}")
    print(f"Order Difference:      {csv_total_orders - platform_total_orders:+4d}")
    print()
    print(f"CSV Processing Sales:      ${csv_total_processing_sales:9.2f}")
    print(f"Platform Processing Sales: ${platform_total_processing_sales:9.2f}")
    print(f"Sales Difference:          ${csv_total_processing_sales - platform_total_processing_sales:+9.2f}")
    print()
    print(f"CSV Refund Amount:      ${csv_total_refunds:8.2f}")
    print(f"Platform Refund Amount: ${platform_total_refunds:8.2f}")
    print(f"Refund Difference:      ${csv_total_refunds - platform_total_refunds:+8.2f}")
    print()
    
    print("=== ANALYSIS RESULTS ===")
    print(f"Perfect Matches: {perfect_matches}")
    print(f"Discrepancies:   {total_discrepancies}")
    
    if total_discrepancies == 0:
        print("🎉 PERFECT ALIGNMENT - CSV and Platform data match exactly!")
    elif total_discrepancies <= 2:
        print("✅ EXCELLENT ALIGNMENT - Minor discrepancies only")
    else:
        print("⚠️  INVESTIGATION NEEDED - Multiple discrepancies found")
    
    print()
    print("=== KEY FINDINGS ===")
    print("1. Delaware location (414 North Union St) appears only in platform - likely from separate import")
    print("2. Main store location mapping: CSV 'Unknown Location' → Platform '4407 Chestnut St'")
    print("3. Drexel location appears in both with identical data")
    print("4. Processing sales amounts match perfectly where locations align")
    print("5. Refund amounts differ due to platform having actual refund values vs CSV showing $0")

if __name__ == "__main__":
    main()