import {AsyncTemplate, Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';

export default class BoardSearch extends Template {
  constructor() {
    super();
    this.loadGlobalStats();
  }
  render() {
    return html`
      <form id="boardSearch" onsubmit="tpl(this).submit(); return false">
        <fieldset>
          <legend>Find your chat</legend>
          <p class="stats">
            ${this.stats ? html`
              Number of boards: ${this.stats.totalCount}<br>
              <a href="#" onclick="tpl(this).viewAll(); return false">Load all</a>
            ` : html`
              Loading global stats...
            `}
          </p>
          <input type="search" name="q">
          <button type="submit">Search</button>
          <p class="help">Case-insensitive match of beginning of board name or symbol.</p>
          <p class="help">Administrator may elect to remove any board from the list but the board will always be available at its contract address.</p>
        </fieldset>
      </form>
      <section>
      ${this.data === 'loading' ? html`
        <p>Loading...</p>
      ` : this.data ? html`
        <ul class="boards">
          ${Object.entries(this.data).map(([boardAddr, board]) => html`
            <li>
              <a href="/${boardAddr}" $${this.link}>${board.name} (${board.symbol})</a>
              <dl>
                <dt>Owner</dt><dd>${displayAddress(board.owner)}</dd>
                <dt>My Token Balance</dt><dd>${board.balance}</dd>
                <dt>Message Count</dt><dd>${board.msgCount}</dd>
              </dl>
            </li>
          `)}
        </ul>
      ` : ''}
      </section>
    `;
  }
  async loadGlobalStats() {
    const directoryABI = await (await fetch('/MsgBoardDirectory.abi')).json();
    const directory = new app.web3.eth.Contract(directoryABI, config.contracts.MsgBoardDirectory.address);
    this.set('stats', {
      totalCount: Number(await directory.methods.totalCount().call()),
    });
  }

  async viewAll() {
    await this.submit('');
  }

  async submit(setValue) {
    this.set('data', 'loading');
    const form = this.element.querySelector('form');
    const directoryABI = await (await fetch('/MsgBoardDirectory.abi')).json();
    const directory = new app.web3.eth.Contract(directoryABI, config.contracts.MsgBoardDirectory.address);
    let response;
    try {
      response = await directory.methods.query(typeof setValue === 'string' ? setValue : form.q.value).call();
    } catch(error) {
      alert(error);
    }

    const browserABI = await (await fetch('/MsgBoardBrowser.abi')).json();
    const browser = new app.web3.eth.Contract(browserABI, config.contracts.MsgBoardBrowser.address);
    const stats = await browser.methods.stats(response, app.currentAccount).call();
    this.set('data', stats.reduce((out, stats, index) => {
      out[response[index]] = stats;
      return out;
    }, {}));
  }

}

