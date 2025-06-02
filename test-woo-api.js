// Test script to verify WooCommerce API directly
const fetch = require('node-fetch');

async function testWooAPI() {
  const url = 'https://nanushotchicken.co/wp-json/wc/v3/orders?per_page=1&consumer_key=ck_0ad2e86583db8d0dd61757acbc4bdc87419c3e60&consumer_secret=cs_dc2155f2f7b20e6a01eecc73cfb685855fe3790c';
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Success:', data.length, 'orders found');
    console.log('First order ID:', data[0]?.id);
    console.log('Location metadata:', data[0]?.meta_data?.find(m => m.key === '_orderable_location_name')?.value);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWooAPI();