# Piece.chat

Reddit-style message board with no superadmin&mdash;everything directly on chain!

## Installation

```
$ git clone https://github.com/numtel/piece-chat.git
$ cd piece-chat
$ npm install
```

Download the `solc` compiler. This is used instead of `solc-js` because it is much faster. Binaries for other systems can be found in the [Ethereum foundation repository](https://github.com/ethereum/solc-bin/).
```
$ curl -o solc https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.15+commit.e14f2714
$ chmod +x solc
```

## Development Frontend

Build the contracts, run the localhost development chain, and host the frontend.

```
$ npm run build-dev
$ npm run dev-chain
$ npm run dev
```

## Testing Contracts

```
# Build contracts before running tests
$ npm run build-dev

$ npm test
```

## License

MIT

## TODO

* identity interface - coinpassport, avatars, custom text
* ens all the things!
* ~~edit post~~
* ~~moderator mint, suppress~~
* ~~owner manage mods, arbitrary transfer~~
* ~~factory board browsing~~
* ~~post sort by newest, oldest, controversial (votes/abs(upvotes-down))~~
* ~~pagination, load more, suppression level to display~~
* fix router back button
* ~~zero address as active account on hot refresh?~~
* account profile page
* feed of multiple boards at once
