// Your task is to build a mini-version of Rutter.
// Rutter standardizes different Ecommerce APIs by fetching data from third-party APIs 
// and then transforming the output to conform to a Rutter-defined schema.


function getProducts() {
  return [
    {
      id: "1",
      platform_id: "123123",
      name: "Product"
    }
  ];
}

function getOrders() {
  return [
    {
      id: "1",
      platform_id: "1312",
      line_items: [
        {
          product_id: "1"
        }
      ]
    }
  ];
}

console.log(getProducts());
console.log(getOrders());