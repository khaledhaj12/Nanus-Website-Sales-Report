// Manual import script to fetch today's orders from Main Store
async function importTodaysOrders() {
  const today = '2025-07-02';
  const url = `https://nanushotchicken.co/wp-json/wc/v3/orders?per_page=50&after=${today}T00:00:00&before=${today}T23:59:59&consumer_key=ck_0ad2e86583db8d0dd61757acbc4bdc87419c3e60&consumer_secret=cs_dc2155f2f7b20e6a01eecc73cfb685855fe3790c`;
  
  try {
    console.log('Fetching orders from WooCommerce API...');
    const response = await fetch(url);
    const orders = await response.json();
    
    console.log(`Found ${orders.length} orders for ${today}`);
    
    for (const order of orders) {
      // Import each order via the import API
      const importData = {
        startDate: today,
        endDate: today
      };
      
      try {
        const importResponse = await fetch('http://localhost:5000/api/import-woo-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storeUrl: 'https://nanushotchicken.co',
            consumerKey: 'ck_0ad2e86583db8d0dd61757acbc4bdc87419c3e60',
            consumerSecret: 'cs_dc2155f2f7b20e6a01eecc73cfb685855fe3790c',
            startDate: today,
            endDate: today
          })
        });
        
        const result = await importResponse.json();
        console.log('Import result:', result);
        break; // Only need to call the import API once
      } catch (importError) {
        console.error('Import failed:', importError);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

importTodaysOrders();