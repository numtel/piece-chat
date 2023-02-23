import Router from '/Router.js';
import Wallet from '/Wallet.js';
import Loader from '/components/Loader.js';
import ErrorWindow from '/components/ErrorWindow.js';

window.app = {
  web3: new Web3(config.rpc),
  wallet: new Wallet,
  router: new Router({
    element: document.getElementById('app'),
    loader: new Loader,
    error: new ErrorWindow,
    routes: [
//       { regex: /^\/(0x[a-f0-9]{40})\/(0x[a-f0-9]{40})\/proposal\/(0x[a-f0-9]{40})$/i,
//         template: '/pages/Proposal.js',
//         constructor: match => [ match[2], match[3], match[1] ] },
//       { regex: /^\/(0x[a-f0-9]{40})\/(0x[a-f0-9]{40})\/([a-z0-9_]+)$/i,
//         template: '/pages/Method.js',
//         constructor: match => [ match[2], match[3], match[1] ] },
//       { regex: /^\/(0x[a-f0-9]{40})\/(0x[a-f0-9]{40})$/i,
//         template: '/pages/Details.js',
//         constructor: match => [ match[2], match[1] ] },
//       { regex: /^\/(0x[a-f0-9]{40})\/([a-z0-9_]+)$/i,
//         template: '/pages/Method.js',
//         constructor: match => [ match[1], match[2] ] },
      { regex: /^\/(0x[a-f0-9]{40})$/i,
        template: '/pages/Board.js',
        constructor: match => [ match[1] ] },
      { regex: /^\//, // catch all others
        template: '/pages/Home.js' },
    ],
  }),
};

