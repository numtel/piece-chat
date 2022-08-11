const assert = require('assert');

exports.placeAndListOrders = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT,
}) {
  const token = await deployContract(accounts[0], 'ExampleFeeToken');
  const products = await deployContract(accounts[0], 'Products');

  const config = [
    1, // price
    token.options.address,
    1 // qtyAvailable
  ];

  const deployed = await products.sendFrom(accounts[0]).deployNew(...config);
  const productKey = deployed.events.NewProduct.returnValues.newProduct;

  assert.strictEqual(
    Number(await products.methods.productCountOf(accounts[0]).call()),
    1);
  const returned = await products.methods.listProductsOf(accounts[0], 0, 10).call();
  assert.strictEqual(returned.length, 1);
  assert.strictEqual(returned[0].owner, accounts[0]);
  assert.strictEqual(returned[0].orderCount, '0');

  await token.sendFrom(accounts[0]).mint(accounts[0], config[0]);
  await token.sendFrom(accounts[0]).approve(products.options.address, config[0]);
  await products.sendFrom(accounts[0]).placeOrder(productKey, 1, '0xbeef');
  assert.strictEqual(await products.methods.orderCount().call(), '1');
  assert.strictEqual(await products.methods.productOrderCount(productKey).call(), '1');

  await token.sendFrom(accounts[1]).mint(accounts[1], config[0] * 2);
  await token.sendFrom(accounts[1]).approve(products.options.address, config[0] * 2);
  assert.strictEqual(await throws(() =>
    products.sendFrom(accounts[1]).placeOrder(productKey, 1, '0xbeef02')), true,
    "Should be out of stock!");
  assert.strictEqual(await throws(() =>
    products.sendFrom(accounts[1]).setQtyAvailable(productKey, 1)), true,
    'Must be owner!');

  await products.sendFrom(accounts[0]).setQtyAvailable(productKey, 2);
  await products.sendFrom(accounts[1]).placeOrder(productKey, 2, '0xbeef02');
  assert.strictEqual(await products.methods.orderCount().call(), '2');

  const orders = await products.methods.listProductOrders(productKey, 0, 10).call();
  assert.strictEqual(orders.length, 2);
  assert.strictEqual(orders[0].purchaser, accounts[0]);
  assert.strictEqual(orders[0].data, '0xbeef');
  assert.strictEqual(orders[0].qty, '1');
  assert.strictEqual(orders[1].purchaser, accounts[1]);
  assert.strictEqual(orders[1].data, '0xbeef02');
  assert.strictEqual(orders[1].qty, '2');
  assert.strictEqual(await products.methods.purchaserOrderCount(accounts[1]).call(), '1');
  assert.strictEqual((await products.methods.listPurchaserOrders(accounts[1], 0, 10).call())[0].data, '0xbeef02');
  assert.strictEqual((await products.methods.listProductOrdersOf(productKey, accounts[0], 0, 10).call())[0].data, '0xbeef');

  await products.sendFrom(accounts[0]).transferOwnership(productKey, accounts[1]);
  assert.strictEqual(await throws(() =>
    products.sendFrom(accounts[0]).transferOwnership(productKey, accounts[2])), true,
    'Must be owner!');

  await token.sendFrom(accounts[2]).mint(accounts[2], config[2] * 2);
  await token.sendFrom(accounts[2]).approve(products.options.address, config[0] * 2);
  await products.sendFrom(accounts[1]).setQtyAvailable(productKey, 2);
  await products.sendFrom(accounts[2]).placeOrder(productKey, 2, '0xbeef03');

  assert.strictEqual(await token.methods.balanceOf(accounts[0]).call(), '3');
  assert.strictEqual(await token.methods.balanceOf(accounts[1]).call(), '2');

};
