import {Template, html} from '/Template.js';
import {ZERO_ACCOUNT} from '/utils.js';

export default class CreatePost extends Template {
  constructor(boardAddr, parent, parentPosts, currentText) {
    super();
    this.set('boardAddr', boardAddr);
    this.set('parent', parent);
    this.set('parentPosts', parentPosts);
    this.set('currentText', currentText);
  }
  render() {
    return html`
      <form onsubmit="tpl(this).submit(); return false">
        <fieldset>
          <legend>${this.currentText ? 'Edit Post' : 'Post reply'}</legend>
          <textarea name="text">${this.currentText || ''}</textarea>
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
    const isEdit = typeof this.currentText === 'string';

    let response;
    try {
      let command;
      if(isEdit) {
        command = board.methods.edit(this.parent, '0x' + zipped);
      } else {
        command = board.methods.post(this.parent || ZERO_ACCOUNT, '0x' + zipped);
      }
      response = await app.wallet.send(command);
    } catch(error) {
      alert(error);
    }
    if(isEdit) {
      this.parentPosts.set(['replies', this.parent], false);
      await this.parentPosts.reloadPost(this.parent);
    } else if(this.parentPosts) {
      await this.parentPosts.prependChild(response.events.NewMsg.returnValues.key, form);
    } else {
      await app.router.goto('/' + this.boardAddr + (this.parent ? '/' + this.parent : ''));
    }
    
  }
}


