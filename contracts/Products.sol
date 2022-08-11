// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract Products {
  struct Product {
    address owner;
    uint price;
    address token;
    uint qtyAvailable;
    uint orderCount;
  }
  struct Order {
    address product;
    uint timestamp;
    address purchaser;
    uint qty;
    bytes data;
  }
  mapping(address => Product) public products;
  uint productCount;

  mapping(address => address[]) public productsByOwner;
  mapping(address => mapping(address => uint)) public productsByOwnerPointers;

  mapping(address => bytes32) public encryptionKeys;

  Order[] public orders;
  mapping(address => uint[]) public ordersByProduct;
  mapping(address => uint[]) public ordersByPurchaser;
  mapping(address => mapping(address => uint[])) public ordersByProductAndPurchaser;

  event OrderPlaced(address indexed product, uint orderNumber, uint qty, address indexed purchaser, address indexed supplier);
  event QtyAvailableUpdated(address indexed product, uint newValue);
  event NewProduct(address indexed newProduct);
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));

  function safeTransferFrom(address token, address from, address to, uint value) internal {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, from, to, value));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FROM_FAILED');
  }

  function deployNew(
    uint price,
    address token,
    uint qtyAvailable
  ) external {
    Product memory newProduct = Product(msg.sender, price, token, qtyAvailable, 0);
    address key = address(uint160(uint256(keccak256(abi.encode(address(this), productCount)))));
    emit NewProduct(key);
    productsByOwnerPointers[msg.sender][key] = productsByOwner[msg.sender].length;
    productsByOwner[msg.sender].push(key);
    products[key] = newProduct;
    productCount++;
  }

  function setQtyAvailable(address productKey, uint newValue) external {
    require(products[productKey].owner == msg.sender);
    emit QtyAvailableUpdated(productKey, newValue);
    products[productKey].qtyAvailable = newValue;
  }

  function transferOwnership(address productKey, address newOwner) external {
    require(products[productKey].owner == msg.sender);
    address oldOwner = products[productKey].owner;
    emit OwnershipTransferred(oldOwner, newOwner);
    products[productKey].owner = newOwner;

    // Remove the product from the current owner's set
    uint last = productsByOwner[oldOwner].length - 1;
    uint rowToReplace = productsByOwnerPointers[oldOwner][productKey];
    if(rowToReplace != last) {
      address keyToMove = productsByOwner[oldOwner][last];
      productsByOwnerPointers[oldOwner][keyToMove] = rowToReplace;
      productsByOwner[oldOwner][rowToReplace] = keyToMove;
    }
    delete productsByOwnerPointers[oldOwner][productKey];
    productsByOwner[oldOwner].pop();

    // Add the product to the new owner's set
    productsByOwnerPointers[newOwner][productKey] = productsByOwner[productKey].length;
    productsByOwner[newOwner].push(productKey);

  }

  function productCountOf(address owner) external view returns(uint) {
    return productsByOwner[owner].length;
  }

  function listProductsOf(address owner, uint startIndex, uint fetchCount) external view returns(Product[] memory) {
    require(startIndex < productsByOwner[owner].length);
    if(startIndex + fetchCount >= productsByOwner[owner].length) {
      fetchCount = productsByOwner[owner].length - startIndex;
    }
    Product[] memory out = new Product[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      out[i] = products[productsByOwner[owner][i]];
    }
    return out;
  }

  function placeOrder(address productKey, uint qty, bytes memory data) external {
    require(products[productKey].qtyAvailable >= qty, "INSUFFICIENT_STOCK");
    emit OrderPlaced(productKey, orders.length, qty, msg.sender, products[productKey].owner);
    products[productKey].qtyAvailable -= qty;
    emit QtyAvailableUpdated(productKey, products[productKey].qtyAvailable);
    ordersByProduct[productKey].push(orders.length);
    ordersByPurchaser[msg.sender].push(orders.length);
    ordersByProductAndPurchaser[productKey][msg.sender].push(orders.length);
    orders.push(Order(productKey, block.timestamp, msg.sender, qty, data));
    safeTransferFrom(products[productKey].token, msg.sender, products[productKey].owner, products[productKey].price * qty);
  }

  function orderCount() external view returns(uint) {
    return orders.length;
  }

  function productOrderCount(address productKey) external view returns(uint) {
    return ordersByProduct[productKey].length;
  }

  function listProductOrders(
    address productKey, uint startIndex, uint fetchCount
  ) external view returns(Order[] memory) {
    require(startIndex < ordersByProduct[productKey].length);
    if(startIndex + fetchCount >= ordersByProduct[productKey].length) {
      fetchCount = ordersByProduct[productKey].length - startIndex;
    }
    Order[] memory out = new Order[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      out[i] = orders[ordersByProduct[productKey][startIndex + i]];
    }
    return out;
  }

  function purchaserOrderCount(address purchaser) external view returns(uint) {
    return ordersByPurchaser[purchaser].length;
  }

  function listPurchaserOrders(
    address purchaser, uint startIndex, uint fetchCount
  ) external view returns(Order[] memory) {
    require(startIndex < ordersByPurchaser[purchaser].length);
    if(startIndex + fetchCount >= ordersByPurchaser[purchaser].length) {
      fetchCount = ordersByPurchaser[purchaser].length - startIndex;
    }
    Order[] memory out = new Order[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      out[i] = orders[ordersByPurchaser[purchaser][startIndex + i]];
    }
    return out;
  }

  function productOrderCountOf(address productKey, address purchaser) external view returns(uint) {
    return ordersByProductAndPurchaser[productKey][purchaser].length;
  }

  function listProductOrdersOf(
    address productKey, address purchaser, uint startIndex, uint fetchCount
  ) external view returns(Order[] memory) {
    require(startIndex < ordersByProductAndPurchaser[productKey][purchaser].length);
    if(startIndex + fetchCount >= ordersByProductAndPurchaser[productKey][purchaser].length) {
      fetchCount = ordersByProductAndPurchaser[productKey][purchaser].length - startIndex;
    }
    Order[] memory out = new Order[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      out[i] = orders[ordersByProductAndPurchaser[productKey][purchaser][startIndex + i]];
    }
    return out;
  }
}

