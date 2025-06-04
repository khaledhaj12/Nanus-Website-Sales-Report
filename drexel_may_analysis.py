#!/usr/bin/env python3

import pandas as pd
import requests
import json

def analyze_drexel_may_data():
    """Analyze Drexel May 2025 data from the image"""
    
    print("=== DREXEL MAY 2025 ANALYSIS ===\n")
    
    # Manual data from the image
    drexel_csv_orders = [
        {"order_id": 14983, "date": "May 2, 2025 5:16 PM", "status": "Processing", "customer": "Changbo", "total": 16.05, "refund": 0},
        {"order_id": 14985, "date": "May 8, 2025 11:39 AM", "status": "Processing", "customer": "Grace", "total": 14.89, "refund": 0},
        {"order_id": 14989, "date": "May 11, 2025 7:25 PM", "status": "Processing", "customer": "Umar", "total": 14.89, "refund": 0},
        {"order_id": 14993, "date": "May 18, 2025 9:04 PM", "status": "Processing", "customer": "Brendan", "total": 16.05, "refund": 0},
        {"order_id": 14994, "date": "May 19, 2025 2:09 PM", "status": "Processing", "customer": "Devante", "total": 16.05, "refund": 0},
        {"order_id": 14999, "date": "May 22, 2025 2:34 PM", "status": "Processing", "customer": "Courtney", "total": 24.01, "refund": 0},
        {"order_id": 15001, "date": "May 24, 2025 9:32 PM", "status": "Processing", "customer": "Jake", "total": 11.43, "refund": 0},
        {"order_id": 15002, "date": "May 24, 2025 9:34 PM", "status": "Processing", "customer": "Ethan", "total": 14.89, "refund": 0},
        {"order_id": 15006, "date": "May 27, 2025 11:02 AM", "status": "Processing", "customer": "Samantha", "total": 11.43, "refund": 0},
        {"order_id": 15007, "date": "May 27, 2025 11:35 AM", "status": "Processing", "customer": "Audrey", "total": 13.74, "refund": 0},
        {"order_id": 15010, "date": "May 30, 2025 12:27 PM", "status": "Processing", "customer": "", "total": 11.43, "refund": 0}
    ]
    
    # Calculate CSV totals
    csv_total_sales = sum(order["total"] for order in drexel_csv_orders)
    csv_total_orders = len(drexel_csv_orders)
    csv_total_refunds = sum(order["refund"] for order in drexel_csv_orders)
    csv_refunded_orders = len([order for order in drexel_csv_orders if order["refund"] > 0])
    
    print("CSV EXPORT DATA (Drexel University Store - May 2025):")
    print(f"Total Sales: ${csv_total_sales:.2f}")
    print(f"Total Orders: {csv_total_orders}")
    print(f"Total Refunds: ${csv_total_refunds:.2f}")
    print(f"Refunded Orders: {csv_refunded_orders}")
    print()
    
    # Get platform data (we'll need to query the API)
    try:
        # Get dashboard summary for May 2025
        response = requests.get("http://localhost:5000/api/dashboard/summary?month=2025-05")
        if response.status_code == 200:
            platform_data = response.json()
            print("PLATFORM DATA (May 2025):")
            print(f"Total Sales: ${platform_data.get('totalSales', 0):.2f}")
            print(f"Total Orders: {platform_data.get('totalOrders', 0)}")
            print(f"Total Refunds: ${platform_data.get('totalRefunds', 0):.2f}")
            print(f"Platform Fees: ${platform_data.get('platformFees', 0):.2f}")
            print(f"Stripe Fees: ${platform_data.get('stripeFees', 0):.2f}")
            print(f"Net Deposit: ${platform_data.get('netDeposit', 0):.2f}")
            print()
            
            # Calculate differences
            sales_diff = abs(csv_total_sales - platform_data.get('totalSales', 0))
            orders_diff = abs(csv_total_orders - platform_data.get('totalOrders', 0))
            refunds_diff = abs(csv_total_refunds - platform_data.get('totalRefunds', 0))
            
            print("COMPARISON:")
            print(f"Sales Difference: ${sales_diff:.2f}")
            print(f"Orders Difference: {orders_diff}")
            print(f"Refunds Difference: ${refunds_diff:.2f}")
            print()
            
            if sales_diff < 0.01 and orders_diff == 0 and refunds_diff < 0.01:
                print("✅ PERFECT MATCH!")
            else:
                print("❌ DISCREPANCIES FOUND")
                print()
                print("DETAILED ANALYSIS:")
                if sales_diff >= 0.01:
                    print(f"- Sales mismatch: ${sales_diff:.2f}")
                if orders_diff > 0:
                    print(f"- Order count mismatch: {orders_diff} orders")
                if refunds_diff >= 0.01:
                    print(f"- Refund mismatch: ${refunds_diff:.2f}")
        else:
            print(f"Failed to get platform data: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("Cannot connect to platform API - using manual comparison")
        print()
        print("CSV DATA SUMMARY:")
        print(f"Total Sales: ${csv_total_sales:.2f}")
        print(f"Total Orders: {csv_total_orders}")
        print(f"All orders are 'Processing' status")
        print(f"No refunds in this dataset")
        print()
        print("ORDER DETAILS:")
        for i, order in enumerate(drexel_csv_orders, 1):
            print(f"{i:2d}. Order {order['order_id']} - ${order['total']:.2f} - {order['customer']}")

if __name__ == "__main__":
    analyze_drexel_may_data()