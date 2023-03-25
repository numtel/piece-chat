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
            <p>Each board is also an ERC20 token that is used to vote on posts. The name and symbol cannot be changed.</p>
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
            <p>Each up/down vote costs the voter one token. The specified mint amount will be your balance. When you upvote a post, they get your token, enabling them to vote on another post. When you downvote, they lose a token, even into negative balances. As board owner, you can decide how to distribute voting power on your board with arbitrary transfers between accounts.</p>
            <div>
              <label>
                <span>Initial Mint</span>
                <input name="initialMint" type="number" min="0" value="0">
              </label>
            </div>
            <p>You can mint more tokens and add more moderators after creation.</p>
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
    const submit = form.querySelector('button[type="submit"]');
    submit.classList.add('loading');
    const factoryABI = await (await fetch('/MsgBoardFactory.abi')).json();
    const factory = new app.web3.eth.Contract(factoryABI, config.contracts.MsgBoardFactory.address);
    let response;
    try {
      response = await app.wallet.send(factory.methods.deployNew(form.name.value, form.symbol.value, form.initialMint.value, ZERO_ACCOUNT, config.contracts.MsgBoardDirectory.address));
    } catch(error) {
      alert(error);
      submit.classList.remove('loading');
    }
    await app.router.goto('/' + response.events.NewBoard.returnValues.addr);

  }
}


