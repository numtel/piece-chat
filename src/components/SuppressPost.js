import {Template, html} from '/Template.js';
import {ZERO_ACCOUNT} from '/utils.js';

export default class MintWidget extends Template {
  constructor(board, msg, posts) {
    super();
    this.set('board', board);
    this.set('msg', msg);
    this.set('posts', posts);
  }
  render() {
    return html`
      <form onsubmit="tpl(this).submit(); return false">
        <fieldset>
          <legend>Suppress Post</legend>
          <div>
            <label>
              <span>Level</span>
            <input name="level" type="number" min="0" value="${this.msg.status}">
            </label>
          </div>
          <div class="submit">
            <button type="submit">Save</button>
          </div>
        </fieldset>
      </form>
    `;
  }
  async submit() {
    const form = this.element.querySelector('form');
    const boardABI = await (await fetch('/MsgBoard.abi')).json();
    const board = new app.web3.eth.Contract(boardABI, this.board.address);
    let response;
    try {
      response = await app.wallet.send(board.methods.setMsgStatus([this.msg.key], [form.level.value]));
    } catch(error) {
      alert(error);
      return;
    }
    this.posts.set(['replies', this.msg.key], false);
  }
}


