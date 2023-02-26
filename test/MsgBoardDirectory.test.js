const assert = require('assert');

exports.canInsertAndQuery = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  // Using another account for factory argument so it has permission to call newBoard
  const directory = await deployContract(accounts[0], 'MsgBoardDirectory', accounts[1]);
  const boards = [
    // [name, symbol]
    ['Testing first board', 'TEST1'],
    ['Testing second board', 'TEST2'],
    // Same name, symbol as first (dupe)
    ['Testing first board', 'TEST1'],
  ];

  for(let board of boards) {
    const deployed = await deployContract(accounts[0], 'MsgBoard', accounts[0], board[0], board[1], 99, ZERO_ADDRESS);
    board.push(deployed.options.address);
    await directory.sendFrom(accounts[1]).newBoard(deployed.options.address);
  }

  async function runQueries(queries) {
    for(let query of Object.keys(queries)) {
      const result = await directory.methods.query(query).call();
      assert.strictEqual(result.length, queries[query].length, `query: ${query}`);
      for(let i=0; i<queries[query].length; i++) {
        assert.strictEqual(result[i], boards[queries[query][i]][2], `query: ${query}`);
      }
    }
  }

  await runQueries({
    'test': [0,1,2],
    'test1': [0,2],
  })

  // Remove the dupe and requery
  await directory.sendFrom(accounts[0]).removeBoard(boards[2][2]);

  await runQueries({
    'test': [0,1],
    'test1': [0],
  });
}
