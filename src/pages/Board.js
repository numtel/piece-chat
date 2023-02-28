import {AsyncTemplate, Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';
import Header from '/components/Header.js';
import CreatePost from '/components/CreatePost.js';
import Posts from '/components/Posts.js';
import MintWidget from '/components/MintWidget.js';
import ArbitraryTransferWidget from '/components/ArbitraryTransferWidget.js';
import AddModeratorWidget from '/components/AddModeratorWidget.js';

export default class Board extends AsyncTemplate {
  constructor(address, key) {
    super();
    this.set('address', address);
    this.set('key', key);
    this.set('data', null);
    this.set('sort', 'Hot');
    this.set('sortFun', sorts[this.sort]);
    this.set('perPage', 10);
    this.set('maxSuppressed', 0);
  }
  async init() {
    if(!this.data) {
      this.data = true; // Default race condition
      const browserABI = await (await fetch('/MsgBoardBrowser.abi')).json();
      this.browser = new app.web3.eth.Contract(browserABI, config.contracts.MsgBoardBrowser.address);

      this.set('data', await Promise.all([
        this.stats(),
        this.children(),
        this.key ? this.browser.methods.fetchLatest(this.address, this.key, app.currentAccount).call() : null,
      ]));
      document.title = `${this.data[0].name} (${this.data[0].symbol})`;
      this.set('isOwner', this.data[0].owner === app.currentAccount);
      this.set('isModerator', this.data[0].moderators.indexOf(app.currentAccount) !== -1);
    }
  }
  children() {
    return this.browser.methods.fetchChildren(this.address, this.key || ZERO_ACCOUNT, this.maxSuppressed, 0, this.perPage, app.currentAccount, this.sort === 'Oldest' ? false : true).call();
  }
  async refreshChildren() {
    this.set(['data', 1], await this.children());
  }
  async stats() {
    return (await this.browser.methods.stats([this.address], app.currentAccount).call())[0];
  }
  async refreshStats() {
    this.set(['data', 0], await this.stats());
  }
  async render() {
    return html`
      ${new Header}
      ${this.data && this.data !== true ? html`
        <header class="board">
          <h2><a href="/${this.address}" $${this.link}>${userInput(this.data[0].name)} (${userInput(this.data[0].symbol)})</a></h2>
          <div class="authorities">
            Owner: ${displayAddress(this.data[0].owner)}, moderators:
            ${this.data[0].moderators.length === 0 ? 'none' : this.data[0].moderators.map(mod => html`
              <span class="moderator">
                ${displayAddress(mod)}
                ${this.isOwner ? html`<button title="Remove Moderator" onclick="tpl(this).removeModerator('${mod}')">Remove</button>` : ''}
              </span>
            `)}
          </div>
          <p class="balance">My Balance: ${this.data[0].balance}</p>
          <div class="mod">
            ${this.isOwner ? new AddModeratorWidget(this) : ''}
            ${this.isOwner ? new ArbitraryTransferWidget(this) : ''}
            ${this.isModerator ? new MintWidget(this) : ''}
          </div>
        </header>
        ${this.key ? new Posts(this, this.data[2].item.parent, this.data[2], true):''}
        ${new CreatePost(this.address, this.key)}
        ${new SortWidget(this)}
        ${new Posts(this, null, this.data[1])}
      ` : ''}
    `;
  }
  async removeModerator(mod) {
    const boardABI = await (await fetch('/MsgBoard.abi')).json();
    const board = new app.web3.eth.Contract(boardABI, this.address);
    let response;
    try {
      response = await app.wallet.send(board.methods.removeModerator(mod));
    } catch(error) {
      alert(error);
      return;
    }
    this.set('showForm', false);
    await this.refreshStats();
  }
}

class SortWidget extends Template {
  constructor(board) {
    super();
    this.set('board', board);
  }
  render() {
    return html`
      <div class="sort">
        <span class="label">Sort by:</span>
        <div class="chooser">
          <a href="#" title="Choose Sort Mode" onclick="tpl(this).toggleSortMenu(); return false" class="active">${this.board.sort}</a>
          ${this.showSortMenu ? html`
            <ul>
              ${Object.keys(sorts).filter(sort => sort !== this.board.sort).map(sort => html`
                <li><a href="#" onclick="tpl(this).setSort('${sort}'); return false">${sort}</a></li>
              `)}
            </ul>
          ` : ''}
        </div>
      </div>
    `;
  }
  toggleSortMenu() {
    this.set('showSortMenu', !this.showSortMenu);
  }
  setSort(newSort) {
    const oldSort = this.board.sort;
    this.set('showSortMenu', false);
    this.board.set('sort', newSort);
    this.board.set('sortFun', sorts[newSort]);
    if(newSort === 'Oldest' || oldSort === 'Oldest') this.board.refreshChildren();
  }
}

const sorts =  {
  'Hot': (a, b) =>
    a.score > b.score ? -1 :
      b.score > a.score ? 1 : 0,
  'Top': (a, b) =>
    a.votes > b.votes ? -1 :
      b.votes > a.votes ? 1 : 0,
  'Newest': (a, b) =>
    a.timestamp > b.timestamp ? -1 :
      b.timestamp > a.timestamp ? 1 : 0,
  'Oldest': (a, b) =>
    a.timestamp > b.timestamp ? 1 :
      b.timestamp > a.timestamp ? -1 : 0,
  'Controversial': (a, b) =>
    a.controversial > b.controversial ? -1 :
      b.controversial > a.controversial ? 1 : 0,
}
