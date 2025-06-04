import pandas as pd
import re

# Read the CSV file
df = pd.read_csv('attached_assets/Mayorders-2025-06-03-17-44-11.csv')

# Clean the data
df['Total Amount'] = pd.to_numeric(df['Total Amount'], errors='coerce')
df['Refund Amount'] = pd.to_numeric(df['Refund Amount'], errors='coerce').fillna(0)
df['Total (- Refund)'] = pd.to_numeric(df['Total (- Refund)'], errors='coerce')

# Filter for Cottman location orders
cottman_orders = df[df['Location'].str.contains('2210 Cottman Ave, Philadelphia, PA', na=False)]

# Remove duplicate refund entries (negative amounts)
cottman_orders_clean = cottman_orders[cottman_orders['Total Amount'] >= 0]

# Calculate metrics
total_orders = len(cottman_orders_clean)
total_sales = cottman_orders_clean['Total (- Refund)'].sum()
refunded_orders = cottman_orders_clean[cottman_orders_clean['Status'] == 'Refunded']
refund_count = len(refunded_orders)
refund_amount = refunded_orders['Refund Amount'].sum()

# Processing orders (successful)
processing_orders = cottman_orders_clean[cottman_orders_clean['Status'] == 'Processing']
processing_count = len(processing_orders)
processing_sales = processing_orders['Total (- Refund)'].sum()

print("=== COTTMAN CSV ANALYSIS ===")
print(f"Total Orders: {total_orders}")
print(f"Processing Orders: {processing_count}")
print(f"Refunded Orders: {refund_count}")
print(f"Total Sales (after refunds): ${total_sales:.2f}")
print(f"Processing Sales: ${processing_sales:.2f}")
print(f"Total Refund Amount: ${refund_amount:.2f}")

# Show status breakdown
status_breakdown = cottman_orders_clean['Status'].value_counts()
print(f"\nStatus Breakdown:")
for status, count in status_breakdown.items():
    print(f"  {status}: {count}")

# Show sample of the data
# Extract all order IDs from CSV
csv_order_ids = set(cottman_orders_clean['Order ID'].astype(str))

print(f"\nFirst 5 Cottman orders:")
print(cottman_orders_clean[['Order ID', 'Status', 'Total Amount', 'Refund Amount', 'Total (- Refund)']].head())

print(f"\nCSV Order IDs count: {len(csv_order_ids)}")
print(f"Sample CSV Order IDs: {list(csv_order_ids)[:10]}")

# Platform has these order IDs (from SQL query)
platform_order_ids = {
    '26004', '26014', '26035', '26044', '26071', '26077', '26083', '26086', '26094', '26107',
    '26114', '26157', '26160', '26173', '26174', '26180', '26183', '26185', '26187', '26193',
    '26199', '26219', '26237', '26240', '26247', '26253', '26259', '26260', '26276', '26286',
    '26319', '26321', '26324', '26344', '26349', '26359', '26384', '26388', '26447', '26448',
    '26449', '26456', '26465', '26470', '26471', '26477', '26487', '26517', '26530', '26562',
    '26563', '26580', '26586', '26595', '26614', '26619', '26652', '26656', '26660', '26663',
    '26666', '26667', '26672', '26677', '26700', '26706', '26744', '26748', '26751', '26758',
    '26763', '26767', '26769', '26777', '26786', '26787', '26799', '26801', '26803', '26838',
    '26855', '26856', '26865', '26870', '26871', '26878', '26881', '26894', '26911', '26914',
    '26916', '26920', '26927', '26951', '26959', '27012', '27017', '27021', '27035', '27036',
    '27037', '27043', '27044', '27047', '27063', '27076', '27088', '27095', '27104', '27119',
    '27143', '27148', '27156', '27157', '27161', '27174', '27191', '27198', '27205', '27210',
    '27211', '27216', '27236', '27240', '27253', '27264', '27270', '27271', '27288', '27291',
    '27292', '27316', '27348', '27356', '27357', '27363', '27364', '27370', '27378', '27383',
    '27384', '27387', '27389', '27390', '27404', '27407', '27409', '27413', '27424', '27430',
    '27432', '27440', '27478', '27479', '27529', '27533', '27536', '27538', '27585', '27630',
    '27634', '27638', '27661', '27666', '27667', '27687', '27695', '27708', '27711', '27714',
    '27721', '27725', '27728', '27741', '27744', '27749', '27754', '27756', '27757', '27765',
    '27774', '27799', '27805', '27828', '27833', '27839', '27841', '27859', '27862', '27865',
    '27871', '27874', '27878', '27882', '27885', '27888', '27915', '27918', '27921', '27924',
    '27926', '27931', '27936', '27943', '27946', '27949', '27951', '27953', '27960', '27969',
    '27974', '27975', '27978', '27983', '27989', '27992', '27996', '28000', '28001', '28004',
    '28013', '28025', '28036', '28052', '28054', '28068', '28075', '28080', '28085', '28102',
    '28110', '28137', '28147', '28173', '28188', '28189', '28191', '28200', '28238', '28250',
    '28283', '28307', '28311', '28314', '28318', '28326', '28328', '28330', '28338', '28353',
    '28354', '28363', '28364', '28372', '28376', '28389', '28390', '28394', '28398', '28405',
    '28406', '28438', '28454', '28468', '28492'
}

print(f"\nPlatform Order IDs count: {len(platform_order_ids)}")

# Find missing orders
missing_in_csv = platform_order_ids - csv_order_ids
extra_in_csv = csv_order_ids - platform_order_ids

print(f"\nOrders in platform but NOT in CSV: {len(missing_in_csv)}")
if missing_in_csv:
    print(f"Missing Order IDs: {sorted(missing_in_csv)}")

print(f"\nOrders in CSV but NOT in platform: {len(extra_in_csv)}")
if extra_in_csv:
    print(f"Extra Order IDs: {sorted(extra_in_csv)}")