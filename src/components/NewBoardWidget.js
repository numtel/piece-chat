import {Template, html} from '/Template.js';
import {ZERO_ACCOUNT} from '/utils.js';

export default class NewBoardWidget extends Template {
  constructor() {
    super();
  }
  render() {
    return html`
      ${this.showForm ? html`
        <form onsubmit="tpl(this).submit(); return false">
          <fieldset>
            <legend>Create a new message board</legend>
            <div>
              <label>
                <span>Name</span>
                <input name="name">
              </label>
            </div>
            <div>
              <label>
                <span>Symbol</span>
                <input name="symbol">
              </label>
            </div>
            <div>
              <label>
                <span>Initial Mint</span>
                <input name="initialMint" type="number" min="0" value="0">
              </label>
            </div>
            <div class="submit">
              <button type="submit">Deploy</button>
              <button onclick="tpl(this).set('showForm', false); return false">Cancel</button>
            </div>
          </fieldset>
        </form>
      ` : html`
        <button onclick="tpl(this).set('showForm', true)">Create New Message Board</button>
      `}
    `
  }
  async submit() {
    const form = this.element.querySelector('form');
    const factoryABI = await (await fetch('/MsgBoardFactory.abi')).json();
    const factory = new app.web3.eth.Contract(factoryABI, config.contracts.MsgBoardFactory.address);
    let response;
    try {
      response = await app.wallet.send(factory.methods.deployNew(form.name.value, form.symbol.value, form.initialMint.value, ZERO_ACCOUNT, config.contracts.MsgBoardDirectory.address));
    } catch(error) {
      alert(error);
    }
    await app.router.goto('/' + response.events.NewBoard.returnValues.addr);

  }
}


