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

        function transfer (address sender, uint256 amount, address recipient, address tokenContract, bytes memory signature) public {

          // Calculate the hash of all the requisite values - getHash
          bytes32 messageHash = getHash(sender, amount, recipient, tokenContract);
      
          // Convert it to a signed message hash  - toEthSignedMessageHash
          bytes32 signedMessageHash = messageHash.toEthSignedMessageHash();

          // Extract the original signer address - recover
          address signer = signedMessageHash.recover(signature);

        // Make sure signer is the person on whose behalf we're executing the transaction
          require(signer == sender, "Signature is not from the sender");

        // Transfer tokens from sender(signer) to recipient - transferFrom
          bool sent = ERC20(tokenContract).transferFrom(sender, recipient, amount);

          require(sent, "Token Transaction failed");

        }

        // Helper function to calculate the keccak256 hash

    function getHash(address sender, uint256 amount, address recipient, address tokenContract) public pure returns(bytes32) {
        return keccak256(
                abi.encodePacked(sender, amount, recipient, tokenContract)
        );
    }
}


/**
  1. imports 
     - The ERC20.sol import is to inherit the base ERC-20 contract implementation from OpenZeppelin,
     - ECDSA stands for Elliptic Curve Digital Signature Algorithm
       it is the signatures algorithm used by Ethereum, and the OpenZeppelin library for ECDSA.sol contains some helper functions used for digital signatures in Solidity.

  2. The Functions
    - The ERC-20 contract is quite self-explanatory, as all it does is let you mint an arbitrary amount of free tokens.
    
    - For TokenSender, there are two functions here. 
      getHash ( helper function)
      transfer

  3. getHash - which takes in the sender address, amount of tokens, recipient address, and tokenContract address, 
  and returns the keccak256 hash of them packed together. 
  abi.encodePacked converts all the specified values in bytes leaving no padding in between and 
  passes it to keccak256 which is a hashing function used by Ethereum. 
  
  This is a pure function so we will also be using this client-side through Javascript 
  to avoid dealing with keccak hashing and packed encodes in Javascript which can be a bit annoying.    

  4. transfer -  takes in the above four parameters, and a signature. 
  It calculates the hash using the getHash helper. 
  After that the message hash is converted to a 'Ethereum Signed Message Hash' according to the EIP-191 . 
  Calling this function converts the messageHash into this format ---"\x19Ethereum Signed Message:\n" + len(message) + message)---. 
  It is important to abide by the standard for interoperability.

  5. After doing so you call 'recover' method 
  in which you pass the signature which is nothing but your ''Ethereum Signed Message'' signed with the sender's private key, 
  you compare it with the --Ethereum Signed Message - signedMessageHash-- you generated - to recover the public key 
  which should be the address of the sender.

  6. If the signer address is the same as the sender address that was passed in, 
  then we transfer the ERC-20 tokens from sender to recipient.




 */