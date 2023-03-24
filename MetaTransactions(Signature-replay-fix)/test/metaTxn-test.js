const {expect} = require('chai');
const {ethers} = require('hardhat');
const {BigNumber} = require('ethers');
const {arrayify, parseEther} = require('ethers/lib/utils');

describe("MetaTokenTransfer", function() {
  it("Should let user transfer tokens through a relayer with different nonces", async function() {
  
    // Deploy the contracts
    const RandomToken = await ethers.getContractFactory("RandomToken");
    const randomTokenContract = await RandomToken.deploy();
    await randomTokenContract.deployed();    

    const TokenSender = await ethers.getContractFactory("TokenSender");
    const tokenSenderContract = await TokenSender.deploy();
    await tokenSenderContract.deployed();

    // Get three addresses, treat one as the user address
    // one as the relayer address, and one as a recipient address  

    const [_, userAddr , relayerAddr, recipientAddr] = await ethers.getSigners();

    const tenThousandTokensWithDecimals = parseEther("10000");
    const userTokenContractInstance = randomTokenContract.connect(userAddr);

    const mintTx = await userTokenContractInstance.freeMint(
      tenThousandTokensWithDecimals
    )

    await mintTx.wait();

    // Have the user - `infinite approve` the token sender contract - for transferring 'RandomToken'
    
    const approveTx = await userTokenContractInstance.approve(
      tokenSenderContract.address,
      BigNumber.from(
        // This is uint256's max value (2^256 - 1) in hex
        // Fun Fact: There are 64 f's in here.
        // In hexadecimal, each digit can represent 4 bits
        // f is the largest digit in hexadecimal (1111 in binary)
        // 4 + 4 = 8 i.e. two hex digits = 1 byte
        // 64 digits = 32 bytes
        // 32 bytes = 256 bits = uint256
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    );
    await approveTx.wait();
    

    // Have user sign message to transfer 10 tokens to recipient
    let nonce = 1;
    const amountOfTokens = parseEther('10');
    const messageHash = await tokenSenderContract.getHash(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address,
      nonce
    );

    const signature = await userAddr.signMessage(arrayify(messageHash));

    // Have the relayer execute the transaction on behalf of the user
    
    const relayerSenderConrtactInstance = tokenSenderContract.connect(relayerAddr);

    const metaTx = await relayerSenderConrtactInstance.transfer(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address,
      nonce,
      signature
    );

    await metaTx.wait();

    // Check the user's balance decreased, and recipient got 10 tokens
    let userBalance = await randomTokenContract.balanceOf(userAddr.address);
    let recipientBalance  = await randomTokenContract.balanceOf(recipientAddr.address);

    expect(userBalance.eq(parseEther('9990'))).to.be.true;
    expect(recipientBalance.eq(parseEther('10'))).to.be.true;
    
    
    // Increment the nonce
    nonce++;


    // Execute another transaction -- SECOND TEST

    const messageHash2 = await tokenSenderContract.getHash(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address,
      nonce
    );

    const signature2 = await userAddr.signMessage(arrayify(messageHash2));

    const metaTx2 = await relayerSenderConrtactInstance.transfer(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address,
      nonce,
      signature2
    );

    await metaTx2.wait();

    userBalance = await randomTokenContract.balanceOf(userAddr.address);
    recipientBalance = await randomTokenContract.balanceOf(recipientAddr.address);

    expect(userBalance.eq(parseEther("9980"))).to.be.true;
    expect(recipientBalance.eq(parseEther("20"))).to.be.true;

  });


    /** 
     * 
     * Third test - Ensures that SIGNATURE REPLAY is not allowed
     * 
     */




    it("Should not allow signature replay" , async function() {

       // Deploy the contracts
    const RandomToken = await ethers.getContractFactory("RandomToken");
    const randomTokenContract = await RandomToken.deploy();
    await randomTokenContract.deployed();    

    const TokenSender = await ethers.getContractFactory("TokenSender");
    const tokenSenderContract = await TokenSender.deploy();
    await tokenSenderContract.deployed();

    // Get three addresses, treat one as the user address
    // one as the relayer address, and one as a recipient address  

    const [_, userAddr , relayerAddr, recipientAddr] = await ethers.getSigners();

    const tenThousandTokensWithDecimals = parseEther("10000");
    const userTokenContractInstance = randomTokenContract.connect(userAddr);

    const mintTx = await userTokenContractInstance.freeMint(
      tenThousandTokensWithDecimals
    )

    await mintTx.wait();

    // Have the user - `infinite approve` the token sender contract - for transferring 'RandomToken'
    
    const approveTx = await userTokenContractInstance.approve(
      tokenSenderContract.address,
      BigNumber.from(
        // This is uint256's max value (2^256 - 1) in hex
        // Fun Fact: There are 64 f's in here.
        // In hexadecimal, each digit can represent 4 bits
        // f is the largest digit in hexadecimal (1111 in binary)
        // 4 + 4 = 8 i.e. two hex digits = 1 byte
        // 64 digits = 32 bytes
        // 32 bytes = 256 bits = uint256
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    );
    await approveTx.wait();
    

    // Have user sign message to transfer 10 tokens to recipient
    let nonce = 1;
    const amountOfTokens = parseEther('10');
    const messageHash = await tokenSenderContract.getHash(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address,
      nonce
    );

    const signature = await userAddr.signMessage(arrayify(messageHash));

    // Have the relayer execute the transaction on behalf of the user
    
    const relayerSenderConrtactInstance = tokenSenderContract.connect(relayerAddr);

    const metaTx = await relayerSenderConrtactInstance.transfer(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address,
      nonce,
      signature
    );

    await metaTx.wait();


    // Have the relayer attempt to execute the same transaction again with the same signature
    // This time, we expect the transaction to be reverted because the signature has already been used.

    expect( 
      relayerSenderConrtactInstance.transfer(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address,
      nonce,
      signature
      )
    ).to.be.revertedWith("Already executed");

    });
});


/**
 * 
 * 
 * After the initial 'infinite approval', 
 * the sender was able to transfer 10 tokens to the recipient without needing to pay gas themselves.
 * You can extend this test further easily to see that this would even work for multiple transfers, 
 *  as long as you don't exceed the user's balance of 10,000 tokens.
 * 
 * 🔓 Security Vulnerability
 * 
 * Since the signature contains the information necessary, 
 * the relayer could keep sending the signature to the contract over and over, 
 * thereby continuously transferring tokens out of the sender's account into the recipient's account.
 * until the user would lose all their tokens!
 * 
 * - This attack is called SIGNATURE REPLAY
 * 
 * Instead, the transaction should only be executed when the user explicitly provides a second signature
 
************************************************************************************************************* 
  To avoid this, we introduce a fifth parameter, the nonce.

The nonce is just a random number value, and can be selected by the user, the contract, be randomly generated, 
it doesn't matter - - as long as the user's signature includes that nonce
Since the exact same transaction but with a different nonce would produce a different signature, 
the above problem is solved!

CODE IMPLEMENTATIONS


1. add a mapping(bytes32 => bool) 
to keep track of which signatures have already been executed.

2. update the helper function getHash to take in a nonce parameter and include that in the hash.

3. update the transfer function to also take in the nonce and pass it onto getHash when verifying the signature. 

4. It will also update the mapping to true AFTER the signature is verified.


----TEST SCENARIO ------

The first test here has the user sign two distinct signatures with two distinct nonces,
 and the relayer executes them both. 
 
 In the second test, however, the relayer attempts to execute the same signature twice. 
The second time the relayer tries to use the same signature, we expect the transaction to revert.

This shows that signature replay can no longer happen, and the vulnerability is secured!



 */