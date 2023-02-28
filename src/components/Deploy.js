import {AsyncTemplate, Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';
import Header from '/components/Header.js';

const contracts = {
  MsgBoardFactory: {},
  MsgBoardBrowser: {},
  MsgBoardDirectory: { constructorArgs: [
    () => contracts.MsgBoardFactory.instance.options.address,
  ]},
};

export default class Deploy extends Template {
  constructor() {
    super();
    this.set('status', '');
  }
  async deploy() {
    for(let contractName of Object.keys(contracts)) {
      this.set('status', this.status +`\nDeploying ${contractName}...`);
      const bytecode = await (await fetch(`/${contractName}.bin`)).text();
      const abi = await (await fetch(`/${contractName}.abi`)).json();
      const newContract = new app.web3.eth.Contract(abi);
      let deployed;
      try {
        deployed = await app.wallet.send(newContract.deploy({
          data: bytecode,
          arguments: 'constructorArgs' in contracts[contractName]
            ? contracts[contractName].constructorArgs.map(arg =>
                typeof arg === 'function' ? arg() : arg)
            : [],
        }));
      } catch(error) {
        alert(error);
      }
      contracts[contractName].instance = deployed;
      this.set('status', this.status +`\nDeployed to ${deployed.options.address}`);
    }
  }
  render() {
    return html`
      ${new Header}
      <div style="padding:30px;">
        <p>This deploys 3 contracts in 3 transactions: the MsgBoardFactory, the MsgBoardBrowser, and the MsgBoardDirectory.</p>
        <button onclick="tpl(this).deploy()">Deploy new instance</button>
        <pre id="status">${this.status}</pre>
      </div>
    `;

  }

}
