const assert = require('assert');

exports.storeAndRetrieve = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  const store = await deployContract(accounts[0], 'PubKeyStore');
  await store.sendFrom(accounts[0]).set('0xbeef');
  const out = await store.methods.pubKey(accounts[0]).call();
  assert.strictEqual(out, '0xbeef000000000000000000000000000000000000000000000000000000000000');

};
