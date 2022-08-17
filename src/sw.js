const ROOT_ADDR = '0x0000000000000000000000000000000000000000';

const window = {};
importScripts('/deps/gunzip.min.js', '/deps/web3.min.js');
const Web3 = window.Web3;
const hostable = [
  'publish.html',
  'username.html',
  'tvision.css',
  'wallet.js',
  'vote.js',
  'sw.js',
  'config.json',
  'deps/coinbase.min.js',
  'deps/gzip.min.js',
  'deps/web3.min.js',
  'deps/web3modal.min.js',
  'Messages.abi',
];

self.addEventListener('fetch', (event) => {
  event.respondWith(loader(event.request));
});

const routes = [
  { pattern: /^\/$/, handler: homePage },
  { pattern: /^\/(0x[a-f0-9]{40})$/i, handler: messagesPage },
  { pattern: /^\/(0x[a-f0-9]{40})\/reply$/i, handler: replyPage },
];

async function loader(request) {
  const config = await (await fetch('/config.json')).json();
  if(!request.url.startsWith(config.root)) return fetch(request);
  const url = new URL(request.url);
  if(hostable.indexOf(url.pathname.slice(1)) !== -1) return fetch(request);

  for(let route of routes) {
    const match = url.pathname.match(route.pattern);
    if(match) {
      try {
        return await route.handler(match, config);
      } catch(error) {
        console.error(error);
      }
    }
  }
  return new Response(`<p>Unable to load document</p>`, {
    headers: { 'Content-Type': 'text/html' }
  });
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
    timestamp: new Date(msgRaw.timestamp * 1000),
    childCount: Number(msgRaw.childCount),
    versionCount: Number(msgRaw.versionCount),
    upvotes,
    downvotes,
    score: calcScore(upvotes, downvotes, age),
    age,
    data: new TextDecoder().decode(gunzip.decompress()),
  };
}

function sortByScore(a, b) {
  return a.score > b.score ? -1 :
    b.score > a.score ? 1 : 0;
}

async function messagesPage(match, config) {
  const root = match ? match[1] : ROOT_ADDR;
  const web3 = new Web3(config.rpc);
  const msgsABI = await (await fetch('/Messages.abi')).json();
  const msgs = new web3.eth.Contract(msgsABI, config.contracts.Messages.address);
  let parent = null, result = [];

  try {
    parent = formatMsg(await msgs.methods.fetchLatest(root).call());
  } catch(error) {}
  try {
    // TODO load more than 10!!!
    result = result.concat(await msgs.methods.fetchChildren(root, 0, 10).call());
  } catch(error) {}

  // TODO support other sort methods
  const doc = result.map(formatMsg).sort(sortByScore);
  return new Response(renderMsgs(parent, doc, root), {
    headers: { 'Content-Type': 'text/html' }
  });
}

async function homePage(match, config) {
  return messagesPage(null, config);
}

async function replyPage(match, config) {
  const root = match ? match[1] : ROOT_ADDR;
  const web3 = new Web3(config.rpc);
  const msgsABI = await (await fetch('/Messages.abi')).json();
  const msgs = new web3.eth.Contract(msgsABI, config.contracts.Messages.address);
  let result;

  try {
    result = formatMsg(await msgs.methods.fetchLatest(root).call());
  } catch(error) {}

  return new Response(`
    ${result ? `
      <div class="root">
        ${renderMsg(result)}
      </div>
    ` : ''}
    <form>
      <input id="parent" type="hidden" value="${root}">
      <textarea id="text"></textarea>
      <button type="submit">Submit</button>
    </form>
    <script src="/deps/web3.min.js"></script>
    <script src="/deps/coinbase.min.js"></script>
    <script src="/deps/web3modal.min.js"></script>
    <script src="/deps/gzip.min.js"></script>
    <script src="/wallet.js"></script>
    <script>
      async function submit(event) {
        event.preventDefault();
        const {accounts,web3,config} = await wallet();
        const parent = document.getElementById('parent').value;
        const text = document.getElementById('text').value;
        const gzip = new Zlib.Gzip(new TextEncoder().encode(text));
        const zipped = Array.from(gzip.compress())
          .map(byte => ('0' + byte.toString(16)).slice(-2))
          .join('');
        let result;
        try {
          const tx = {
            to: config.contracts.Messages.address,
            from: accounts[0],
            data: web3.eth.abi.encodeFunctionCall({
              name: 'post', type: 'function',
              inputs: [
                { type: 'address', name: 'parent' },
                { type: 'bytes', name: 'data' }
              ],
            }, [ parent, '0x' + zipped ])
          };
          tx.gas = await web3.eth.estimateGas(tx);
          result = await web3.eth.sendTransaction(tx);
        } catch(error) {
          console.log(error);
          alert(error.message || error);
          return;
        }
        window.location.pathname = '/0x' + result.logs[0].topics[1].slice(-40);
      }
      document.querySelector('form').addEventListener('submit', submit);
    </script>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}


function renderMsgs(parent, data, root) {
  return `
    <script src="/deps/web3.min.js"></script>
    <script src="/deps/coinbase.min.js"></script>
    <script src="/deps/web3modal.min.js"></script>
    <script src="/deps/gzip.min.js"></script>
    <script src="/wallet.js"></script>
    <script src="/vote.js"></script>
    ${parent ? `
      <div class="root">
        ${renderMsg(parent)}
      </div>
    ` : `
      <div class="root empty">
        <a href="/${root}/reply">Post reply...</a>
      </div>
    `}
    ${data.length > 0 ? `
      <ul class="children">
        ${data.map(child => renderMsg(child)).join('')}
      </ul>
    ` : ''}
  `;
}

function renderMsg(msg) {
  return `
    <div class="msg">
      <dl>
        <dt>Author</dt>
        <dd><a href="/account/${msg.author}">${msg.author}</a></dd>
        <dt>Parent</dt>
        <dd><a href="/${msg.parent}">${msg.parent}</a></dd>
        <dt>Timestamp</dt>
        <dd>${msg.timestamp.toLocaleString()} ${msg.versionCount > 1 ? '(Edited)' : ''}</dd>
        <dt>Text</dt>
        <dd>${msg.data}</dd>
        <dt>Score</dt>
        <dd>${msg.upvotes - msg.downvotes}, ${msg.age}, ${msg.score}, Up: ${msg.upvotes} Down: ${msg.downvotes}
          <button onclick="vote('${msg.key}', true)">Upvote</button>
          <button onclick="vote('${msg.key}', false)">Downvote</button>
        </dd>
      </dl>
      <a href="/${msg.key}">View ${msg.childCount} child${msg.childCount === 1 ? '' : 'ren'}...</a>
      <a href="/${msg.key}/reply">Post reply...</a>
    </div>
  `;
}
