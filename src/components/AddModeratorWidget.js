import {Template, html} from '/Template.js';
import {ZERO_ACCOUNT} from '/utils.js';

export default class AddModeratorWidget extends Template {
  constructor(board) {
    super();
    this.set('board', board);
  }
  render() {
    return html`
      ${this.showForm ? html`
        <form onsubmit="tpl(this).submit(); return false">
          <fieldset>
            <legend>Add Moderator</legend>
            <div>
              <label>
                <span>Account</span>
                <input name="account">
              </label>
            </div>
            <div class="submit">
              <button type="submit">Approve</button>
            </div>
          </fieldset>
        </form>
      ` : html`
        <button onclick="tpl(this).set('showForm', true)">Add Moderator</button>
      `}
    `
  }
  async submit() {
    const form = this.element.querySelector('form');
    const boardABI = await (await fetch('/MsgBoard.abi')).json();
    const board = new app.web3.eth.Contract(boardABI, this.board.address);
    let response;
    try {
      response = await app.wallet.send(board.methods.addModerator(form.account.value));
    } catch(error) {
      alert(error);
      return;
    }
    this.set('showForm', false);
    await this.board.refreshStats();
  }
}

