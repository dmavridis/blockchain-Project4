// Import packages
const express = require('express')
const app = express()
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');

var Blockchain = require('./simpleChain.js')
app.use(express.json())
const PORT  = 8000;
const VALIDATION_WINDOW = 300;
const STORYLIMIT = 250;
let blockchain = new Blockchain.Blockchain();

// Dictionnary that holds the information after user validation request
let messagesToSign = {}
let registerStarUser = {}

// Root path 
app.get('/', (req, res) => res.send('Welcome to the Notary Blockhain service!'))

// Path for Validation request
// User is submitting their wallet address and receive a message to sign
app.post('/requestValidation', (req,res) => {
  let address = req.body.address
  let validationWindow
  let timeStamp

  // If this is not the first request validation window needs update
  if (messagesToSign[address] !== undefined){
    timeStamp = messagesToSign[address].requestTimeStamp
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
    let userMessageToSign = {
                              "address": address,
                              "requestTimeStamp": timeStamp,
                              "message": message,
                              "validationWindow": validationWindow
                            }
    messagesToSign[address] = userMessageToSign
    res.send(userMessageToSign)
    
  }
})

// Path for signature validation
// Message is checked for validity using the bitcoin library
// If it is within time and valid user can procceed to registration
app.post('/message-signature/validate', (req,res) => {
  let address = req.body["address"]
  let signature = req.body["signature"]
  let registerStar = false
  let messageSignature = "invalid"


  // get the message of the user from the dictionary
  let userMessage = messagesToSign[address]

  if (userMessage === undefined){
    res.send("Invalid request, please request validation first!")
  }
  else {
    if (bitcoinMessage.verify(userMessage.message, address, signature)){
      messageSignature = "valid"
      registerStar = true
    }
    // check that request is within validation window
    let timeStamp = userMessage.requestTimeStamp
    let currentTime = new Date().getTime().toString().slice(0,-3)
    validationWindow = VALIDATION_WINDOW - (currentTime - timeStamp)

    if (validationWindow < 0){
      delete messagesToSign[address]
      res.send("Session expired, please try again!")
    }
    else{
      let starUser = {
                      "registerStar": registerStar,
                      "status": 
                      {
                        "address": address,
                        "requestTimeStamp": userMessage.requestTimeStamp,
                        "message": userMessage.message,
                        "validationWindow": validationWindow,
                        "messageSignature": messageSignature
                      }
                    }
      registerStarUser[address] = starUser
      res.send(starUser)
      if (registerStar){
        delete messagesToSign[address] // not necessary anymore
      }
      }
    }
})

// Path to add star to the blockchain
app.post('/block', async (req,res) => {
  let starBody = req.body
  // Check if register star is valid and still within time window

  if (registerStarUser[starBody.address] === undefined){
    res.send("No session or session expired, please try again!")
  }  
  else if (registerStarUser[starBody.address].registerStar === false){
    res.send("Request rejected, invalid signature or star already submitted")
    delete registerStarUser[starBody.address]
  }
  else {
    // check for length of story and existence of dec and ra coordinates
    if (starBody.star.dec === undefined || starBody.star.ra === undefined){
      res.send("Missing Star data!")
    }
    else if (starBody["star"]["story"].length > STORYLIMIT){
      res.send("Maximum story length exceeded!")
    }
    else{ // adding the data
      // Encode the body
      starBody.star.story = Buffer.from(starBody.star.story, 'ascii').toString('hex')
      registerStarUser[starBody.address].registerStar = false // invalidate duplicate attempts
      // Add entry to the blockchain
      blockchain.addBlock(new Blockchain.Block(starBody))
      .then(()=>blockchain.getBlockHeight())
      .then((value)=>blockchain.getBlock(value))
      .then((value) => res.send(value))
     }
  }
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
      found = true
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
  let h = req.params.height
  let hmax = await blockchain.getBlockHeight()

  h = Math.min(h,hmax-1)
  let block = await blockchain.getBlock(h)
  if (h === 0){
    res.send(block)
  }
  else {
    block.body.star["storyDecoded"] = new Buffer(block.body.star.story, 'hex').toString('ascii');
    res.send(block)
  }

})

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}`))