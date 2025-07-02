// Test script to verify WooCommerce API directly
// Built-in fetch available in Node.js 18+

async function testWooAPI() {
  // Test for orders from July 2, 2025 specifically
  const today = '2025-07-02';
  const url = `https://nanushotchicken.co/wp-json/wc/v3/orders?per_page=50&after=${today}T00:00:00&before=${today}T23:59:59&consumer_key=ck_0ad2e86583db8d0dd61757acbc4bdc87419c3e60&consumer_secret=cs_dc2155f2f7b20e6a01eecc73cfb685855fe3790c`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log(`Found ${data.length} orders for ${today}`);
    
    if (data.length > 0) {
      data.forEach((order, index) => {
        console.log(`Order ${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  Date: ${order.date_created}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Total: $${order.total}`);
        console.log(`  Customer: ${order.billing.first_name} ${order.billing.last_name}`);
        console.log('---');
      });
    } else {
      console.log('No orders found for today');
      // Try fetching all recent orders
      console.log('\nFetching recent orders...');
      const recentUrl = `https://nanushotchicken.co/wp-json/wc/v3/orders?per_page=10&consumer_key=ck_0ad2e86583db8d0dd61757acbc4bdc87419c3e60&consumer_secret=cs_dc2155f2f7b20e6a01eecc73cfb685855fe3790c`;
      const recentResponse = await fetch(recentUrl);
      const recentData = await recentResponse.json();
      console.log(`Recent orders (${recentData.length}):`);
      recentData.forEach((order, index) => {
        console.log(`  ${index + 1}. Order ${order.id} - ${order.date_created} - $${order.total}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testWooAPI();