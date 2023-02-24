import {Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress, remaining} from '/utils.js';
import CreatePost from '/components/CreatePost.js';
import SuppressPost from '/components/SuppressPost.js';

export default class Posts extends Template {
  constructor(board, parent, posts, displaySingle) {
    super();
    this.set('board', board);
    this.set('parent', parent);
    this.set('displaySingle', displaySingle);
    this.set('children', {});
    this.set('replies', {});
    this.set('data', posts.map(formatMsg).sort(board.sortFun));
  }
  render() {
    return html`
      ${this.data && this.data.length > 0 ? html`
        <ul class="children">
          ${this.data.map(child => this.renderMsg(child, !this.displaySingle))}
        </ul>
      ` : ''}
    `;
  }
  renderMsg(msg, displayAsChild, displayAsReply) {
    // TODO allow unvoting
    return html`
      <div class="msg">
        <div class="score">
          <button class="up" onclick="tpl(this).vote('${msg.key}', 1)">Upvote</button>
          <button class="down" onclick="tpl(this).vote('${msg.key}', 2)">Downvote</button>
        </div>
        <div class="body">
          <div class="metadata">
            <span class="author"><a href="/account/${msg.author}">${displayAddress(msg.author)}</a></span>
            <span class="score">${msg.upvotes - msg.downvotes} ${Math.abs(msg.upvotes - msg.downvotes)===1 ? 'point' : 'points'}<!-- Age: ${msg.age}, Score: ${msg.score}, Up: ${msg.upvotes} Down: ${msg.downvotes} --></span>
            <span class="time"><time title="${msg.timestamp.toLocaleString()}" datetime="${msg.timestamp.toJSON()}">${msg.ago} ago</time> ${msg.versionCount > 1 ? '(Edited)' : ''}</time></span>
          </div>
          <div class="text">
            ${userInput(msg.data)}
          </div>
          <a class="control" href="/${this.board.address}/${msg.key}" $${this.link}>permalink</a>
          ${displayAsReply ? '' : html`<a class="control" href="/${this.board.address}/${msg.key}" onclick="tpl(this).set(['replies', '${msg.key}'], true); return false">reply</a>`}
          <a class="control" href="/${this.board.address}${msg.parent === ZERO_ACCOUNT ? '' : `/${msg.parent}`}" $${this.link}>parent</a>
          ${msg.author === app.currentAccount ? html`<a class="control" href="#" onclick="tpl(this).set(['replies', '${msg.key}'], 'edit'); return false">edit</a>` : ''}
          ${this.board.isModerator ? html`<a class="control" href="#" onclick="tpl(this).set(['replies', '${msg.key}'], 'suppress'); return false">suppress</a>` : ''}
          ${this.replies[msg.key] ?
            this.replies[msg.key] === 'suppress' ? new SuppressPost(this.board, msg, this) :
            new CreatePost(this.board.address, msg.key, this, this.replies[msg.key] === 'edit' ? msg.data : null) : ''}
          ${displayAsChild ? (msg.childCount > 0 ? (msg.key in this.children ? this.children[msg.key] : html`<div class="children"><a href="/${this.board.address}/${msg.key}" class="loadChildren" onclick="tpl(this).loadChildren('${msg.key}', event.target); return false">Load ${msg.childCount} child${msg.childCount === 1 ? '' : 'ren'}...</a></div>`) : '') : ''}
        </div>
      </div>
    `;
  }
  async loadChildren(key, target) {
    if(target) target.closest('.children').innerHTML = 'Loading...';
    const browserABI = await (await fetch('/MsgBoardBrowser.abi')).json();
    const browser = new app.web3.eth.Contract(browserABI, config.contracts.MsgBoardBrowser.address);
    // TODO pagination
    const data = await browser.methods.fetchChildren(this.board.address, key, 0, 0, 10).call();
    this.set(['children', key], new Posts(this.board, key, data));
  }
  async vote(key, newVote) {
    const boardABI = await (await fetch('/MsgBoard.abi')).json();
    const board = new app.web3.eth.Contract(boardABI, this.board.address);
    try {
      await app.wallet.send(board.methods.vote(key, newVote));
    } catch(error) {
      console.log(error);
      alert(error.message || error);
      return;
    }
    await this.reloadPost(key);
  }
  async reloadPost(key) {
    const browserABI = await (await fetch('/MsgBoardBrowser.abi')).json();
    const browser = new app.web3.eth.Contract(browserABI, config.contracts.MsgBoardBrowser.address);
    const latest = await browser.methods.fetchLatest(this.board.address, key).call();
    let index=0;
    for(;this.data[index].key !== key; index++);
    this.set(['data', index], formatMsg(latest));
  }
  async prependChild(key, form) {
    const browserABI = await (await fetch('/MsgBoardBrowser.abi')).json();
    const browser = new app.web3.eth.Contract(browserABI, config.contracts.MsgBoardBrowser.address);
    const latest = await browser.methods.fetchLatest(this.board.address, key).call();
    const parent = await browser.methods.fetchLatest(this.board.address, latest.parent).call();
    if(latest.parent in this.children) {
      this.children[latest.parent].data.unshift(formatMsg(latest));
      // Re-render the child list
      this.children[latest.parent].set();
    } else {
      this.loadChildren(latest.parent, form.closest('.msg').querySelector('.loadChildren'));
    }
    let index=0;
    for(;this.data[index].key !== latest.parent; index++);
    // This will trigger the component to render
    this.set(['data', index], formatMsg(parent));
    this.set(['replies', latest.parent], false);
  }
}


function calcScore(upvotes, downvotes, age) {
  if(upvotes === 0 && downvotes === 0) return 0;
  let positive = upvotes, negative = downvotes;
  if(downvotes > upvotes) {
    // Equation doesn't work with <0
    positive = downvotes;
    negative = upvotes;
  }
  // From http://www.evanmiller.org/how-not-to-sort-by-average-rating.html
  let score = ((positive + 1.9208) / (positive + negative) -
     1.96 * Math.sqrt((positive * negative) / (positive + negative) + 0.9604) /
        (positive + negative)) / (1 + 3.8416 / (positive + negative))

  if(downvotes > upvotes) {
    score *= -1 * age;
  } else {
    score /= age;
  }
  return score;
}

function formatMsg(msgRaw) {
  if(!msgRaw) return msgRaw;
  const gunzip = new Zlib.Gunzip(Uint8Array.from(msgRaw.data.slice(2).match(/.{1,2}/g).map((byte) => parseInt(byte, 16))));
  const upvotes = Number(msgRaw.upvotes);
  const downvotes = Number(msgRaw.downvotes);
  const age = Math.floor(Date.now() / 1000) - msgRaw.timestamp;
  return {
    author: msgRaw.author,
    parent: msgRaw.parent,
    key: msgRaw.key,
    status: msgRaw.status,
    timestamp: new Date(msgRaw.timestamp * 1000),
    ago: remaining(Math.floor(Date.now()/1000) - msgRaw.timestamp, true),
    childCount: Number(msgRaw.childCount),
    versionCount: Number(msgRaw.versionCount),
    upvotes,
    downvotes,
    votes: upvotes - downvotes,
    controversial: (upvotes + downvotes) / Math.abs(upvotes - downvotes),
    score: calcScore(upvotes, downvotes, age),
    age,
    data: new TextDecoder().decode(gunzip.decompress()),
  };
}
