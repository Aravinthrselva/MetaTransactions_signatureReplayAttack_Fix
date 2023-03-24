// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract RandomToken is ERC20 {
    constructor() ERC20("random", "RNDM") {}

    function freeMint(uint256 amount) public {
        _mint(msg.sender, amount);
    } 
}

contract TokenSender {
        using ECDSA for bytes32;

        // mapping to keep track of previously executed transaction hashes
        mapping(bytes32 => bool) executed;

        function transfer (address sender, uint256 amount, address recipient, address tokenContract, uint nonce, bytes memory signature) public {

          // Calculate the hash of all the requisite values - getHash
          bytes32 messageHash = getHash(sender, amount, recipient, tokenContract, nonce);
      
          // Convert it to a signed message hash  - toEthSignedMessageHash
          bytes32 signedMessageHash = messageHash.toEthSignedMessageHash();

          require(!executed[signedMessageHash], "Already executed");

          // Extract the original signer address - recover
          address signer = signedMessageHash.recover(signature);

          // Make sure signer is the person on whose behalf we're executing the transaction
          require(signer == sender, "Signature is not from the sender");

          // Mark this signature as having been executed now
          executed[signedMessageHash] = true;

          // Transfer tokens from sender(signer) to recipient - transferFrom
          bool sent = ERC20(tokenContract).transferFrom(sender, recipient, amount);

          require(sent, "Token Transaction failed");

        }

        // Helper function to calculate the keccak256 hash

    function getHash(address sender, uint256 amount, address recipient, address tokenContract, uint nonce) public pure returns(bytes32) {
        return keccak256(
                abi.encodePacked(sender, amount, recipient, tokenContract, nonce)
        );
    }
}


/**
FIXING SIGNATURE REPLAY 

1. there are 4 variables to keep track of here per transfer - 
sender, amount, recipient, and tokenContract. 
Creating a nested mapping this deep can be quite expensive in Solidity.

Also, that would be different for each 'kind' of a smart contract - as you're not always dealing with the same use case


2. A more general-purpose solution for this is to create a single mapping from the hash of the parameters to a boolean value, 
where true indicates that this meta-transaction has already been executed, and false indicates it hasn't.

Something like mapping(bytes32 => bool).


3. This also has a problem though. 
With the current set of parameters

if Alice sent 10 tokens to Bob, 
it would go through the first time, 
and the mapping would be updated to reflect that. 
However, what if Alice genuinely wants to send 10 more tokens to Bob a second time?


4. Since digital signatures are deterministic, i.e. the same input will give the same output for the same set of keys, 
that means Alice would never be able to send Bob 10 tokens again! - as the hash is already set to true  


5. To avoid this, we introduce a fifth parameter, the nonce.

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

 */