import {Template, html} from '/Template.js';
import {ZERO_ACCOUNT} from '/utils.js';

export default class ArbitraryTransferWidget extends Template {
  constructor(board) {
    super();
    this.set('board', board);
  }
  render() {
    return html`
      ${this.showForm ? html`
        <form onsubmit="tpl(this).submit(); return false">
          <fieldset>
            <legend>Transfer Tokens</legend>
            <div>
              <label>
                <span>Origin</span>
                <input name="origin">
              </label>
            </div>
            <div>
              <label>
                <span>Recipient</span>
                <input name="recipient">
              </label>
            </div>
            <div>
              <label>
                <span>Amount</span>
              <input name="amount" type="number" min="0" value="0">
              </label>
            </div>
            <div class="submit">
              <button type="submit">Transfer</button>
            </div>
          </fieldset>
        </form>
      ` : html`
        <button onclick="tpl(this).set('showForm', true)">Arbitrary Transfer</button>
      `}
    `
  }
  async submit() {
    const form = this.element.querySelector('form');
    const boardABI = await (await fetch('/MsgBoard.abi')).json();
    const board = new app.web3.eth.Contract(boardABI, this.board.address);
    let response;
    try {
      response = await app.wallet.send(board.methods.arbitraryTransfer(form.origin.value, form.recipient.value, form.amount.value));
    } catch(error) {
      alert(error);
      return;
    }
    this.set('showForm', false);
    await this.board.refreshStats();
  }
}


