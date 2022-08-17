async function vote(key, up) {
  const {accounts,web3,config} = await wallet();
  try {
    const tx = {
      to: config.contracts.Messages.address,
      from: accounts[0],
      data: web3.eth.abi.encodeFunctionCall({
        name: 'vote', type: 'function',
        inputs: [
          { type: 'address', name: 'key' },
          { type: 'bool', name: 'upvote' }
        ],
      }, [ key, up ])
    };
    tx.gas = await web3.eth.estimateGas(tx);
    result = await web3.eth.sendTransaction(tx);
  } catch(error) {
    console.log(error);
    alert(error.message || error);
    return;
  }
  window.location.reload();
}
