// Import packages
const express = require('express')
const app = express()
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');

var Blockchain = require('./simpleChain.js')
app.use(express.json())
const PORT  = 8000;
const VALIDATION_WINDOW = 300;
let blockchain = new Blockchain.Blockchain();

// Dictionnary that holds the information after user validation request
let messagesToSign = {} 

// Root path 
app.get('/', (req, res) => res.send('Welcome to the Notary Blockhain service!'))

// Path for Validation request
// User is submitting their wallet address and receive a message to sign
app.post('/requestValidation', (req,res) => {
  let address = req.body["address"]
  let validationWindow
  let timeStamp


  // If this is not the first request validation window needs update
  if (messagesToSign[address] !== undefined){
    timeStamp = JSON.parse(messagesToSign[address]).requestTimeStamp
    currentTime = new Date().getTime().toString().slice(0,-3)
    validationWindow = VALIDATION_WINDOW - (currentTime - timeStamp)
  }
  else{
    timeStamp =  new Date().getTime().toString().slice(0,-3)
    validationWindow = VALIDATION_WINDOW
  }

  let message = address + ":" + timeStamp + ":starRegistry"
  // If validationWindow < 0 expire the session else send response 
  if (validationWindow < 0){
    res.send("Session expired, please try again!")
    delete messagesToSign[address]
  }
  else {
    let userMessageToSign = JSON.stringify(
                        {
                          "address": address,
                          "requestTimeStamp": timeStamp,
                          "message": message,
                          "validationWindow": validationWindow
                        })
    messagesToSign[address] = userMessageToSign
    res.send(userMessageToSign)
  }
})

// Path for signature validation
// Message is checked fr validity using the bitcoin library
// If it is within time and valid user can procceed to registration
app.post('/message-signature/validate', (req,res) => {
  let address = req.body["address"]
  let signature = req.body["signature"]
  let registerStar = true

  // get the message of the user from the dictionary
  let userMessage = JSON.parse(messagesToSign[address])

  // validate the message with the signature
  let messageSignature = "invalid"
  if (bitcoinMessage.verify(userMessage.message, address, signature)){
     messageSignature = "valid"
  }

  // check that request is within validation window
  let timeStamp = userMessage.requestTimeStamp
  let currentTime = new Date().getTime().toString().slice(0,-3)
  validationWindow = VALIDATION_WINDOW - (currentTime - timeStamp)

  if (validationWindow < 0){
    res.send("Session expired, please try again!")
  }
  else{
    res.send(JSON.stringify(
      {
        "registerStar": registerStar,
        "status": {
          "address": address,
          "requestTimeStamp": userMessage.requestTimeStamp,
          "message": userMessage.message,
          "validationWindow": validationWindow,
          "messageSignature": messageSignature
        }
      }))
    }
})

// Path to add star to the blockchain
app.post('/block', async (req,res) => {
  let starBody = req.body

  // Encode the body
  starBody["star"]["story"] = Buffer.from(starBody["star"]["story"], 'ascii').toString('hex')

  blockchain.addBlock(new Blockchain.Block(starBody))
  .then(()=>blockchain.getBlockHeight())
  .then((value)=>blockchain.getBlock(value))
  .then((value) => res.send(value))
})

// Path to lookup star by address
app.get('/stars/address::addressId', async (req,res) => {
  let addressId = req.params.addressId
  let result = []
  let h = await blockchain.getBlockHeight()
  let found = false

  for (var i = 1; i< h; i++){
    let block = await blockchain.getBlock(i)

    if (block.body["address"] === addressId){
      found = true
      block.body.star["storyDecoded"] = new Buffer(block.body.star.story, 'hex').toString('ascii');
      result.push(block)
    }
  }
  if (!found){
    res.send("No results found")
  }
  else{
    res.send(result)
  }
})

// Path to lookup star by hash
app.get('/stars/hash::hashId', async (req,res) => {
  let hashId = req.params.hashId
  let found = false
  let h = await blockchain.getBlockHeight()

  for (var i = 1; i< h; i++){
    let block = await blockchain.getBlock(i)

    if (block.hash === hashId){
      found = True
      block.body.star["storyDecoded"] = new Buffer(block.body.star.story, 'hex').toString('ascii');
      res.send(block)
      break
    }
  }
  if (!found){
    res.send("No results found")
  }
})

// Path to lookup star by blockchain height
app.get('/block/:height', async (req,res) => {
  let block = await blockchain.getBlock(req.params.height)
  block.body.star["storyDecoded"] = new Buffer(block.body.star.story, 'hex').toString('ascii');
  res.send(block)
})

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}`))