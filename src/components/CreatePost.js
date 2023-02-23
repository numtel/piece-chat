import {Template, html} from '/Template.js';
import {ZERO_ACCOUNT} from '/utils.js';

export default class CreatePost extends Template {
  constructor(boardAddr, parent) {
    super();
    this.set('boardAddr', boardAddr);
    this.set('parent', parent);
  }
  render() {
    return html`
      <form onsubmit="tpl(this).submit(); return false">
        <fieldset>
          <legend>Post reply</legend>
          <textarea name="text"></textarea>
          <button type="submit">Submit</button>
        </fieldset>
      </form>
    `;
  }
  async submit() {
    const form = this.element.querySelector('form');
    const boardABI = await (await fetch('/MsgBoard.abi')).json();
    const board = new app.web3.eth.Contract(boardABI, this.boardAddr);
    const gzip = new Zlib.Gzip(new TextEncoder().encode(form.text.value));
    const zipped = Array.from(gzip.compress())
      .map(byte => ('0' + byte.toString(16)).slice(-2))
      .join('');

    try {
      await app.wallet.send(board.methods.post(this.parent || ZERO_ACCOUNT, '0x' + zipped));
    } catch(error) {
      alert(error);
    }
    await app.router.goto('/' + this.boardAddr + (this.parent ? '/' + this.parent : ''));
    
  }
}


