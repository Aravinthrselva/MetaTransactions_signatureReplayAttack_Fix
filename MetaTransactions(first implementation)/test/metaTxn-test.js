const {expect} = require('chai');
const {ethers} = require('hardhat');
const {BigNumber} = require('ethers');
const {arrayify, parseEther} = require('ethers/lib/utils');

describe("MetaTokenTransfer", function() {
  it("Should let user transfer tokens through a relayer", async function() {
  
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

    const amountOfTokens = parseEther('10');
    const messageHash = await tokenSenderContract.getHash(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address
    );

    const signature = await userAddr.signMessage(arrayify(messageHash));

    // Have the relayer execute the transaction on behalf of the user
    
    const relayerSenderConrtactInstance = tokenSenderContract.connect(relayerAddr);

    const metaTx = await relayerSenderConrtactInstance.transfer(
      userAddr.address,
      amountOfTokens,
      recipientAddr.address,
      randomTokenContract.address,
      signature
    );

    await metaTx.wait();

    // Check the user's balance decreased, and recipient got 10 tokens
    const userBalance = await randomTokenContract.balanceOf(userAddr.address);
    const recipientBalance  = await randomTokenContract.balanceOf(recipientAddr.address);

    expect(userBalance.lt(tenThousandTokensWithDecimals)).to.be.true;
    expect(recipientBalance.gt(BigNumber.from(0))).to.be.true;

  })

})


/**
 * 
 * 
 * After the initial 'infinite approval', 
 * the sender was able to transfer 10 tokens to the recipient without needing to pay gas themselves.
 * You can extend this test further easily to see that this would even work for multiple transfers, 
 *  as long as you don't exceed the user's balance of 10,000 tokens.
 * 
 * 
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

 */