/* ===== REst Functions =======================
|  Functions to operate on a LevelDB  			   |
|  ===============================================*/

const express = require('express')
const app = express()
var Blockchain = require('./simpleChain.js')
app.use(express.json())
const PORT  = 8000;

let blockchain = new Blockchain.Blockchain();

app.get('/', (req, res) => res.send('Welcome Notary Blockhain service!'))

app.post('/message-signature/validate', (req,res) => {
  let address = req.body["address"]
  let signature = req.body["signature"]
  let timestamp = new Date().getTime().toString().slice(0,-3)
  let registerStar = true


  console.log("POST on port 8000")
  
  res.send(JSON.stringify(
    {
      "registerStar": registerStar,
      "status": {
        "address": address,
        "requestTimeStamp": timestamp,
        "message": address + ":" + timestamp + ":starRegistry",
        "validationWindow": 193,
        "messageSignature": "valid"
      }
    }))

})

app.post('/requestValidation', (req,res) => {

  res.send(JSON.stringify(
  {
    "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
    "requestTimeStamp": "1532296090",
    "message": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ:1532296090:starRegistry",
    "validationWindow": 300
  }))
})


app.post('/block', (req,res) => {
  let starBody = req.body
  starBody["star"]["story"] = Buffer.from(starBody["star"]["story"], 'ascii').toString('hex')

  blockchain.addBlock(new Blockchain.Block(starBody))
  .then(()=>blockchain.getBlockHeight())
  .then((value)=>blockchain.getBlock(value))
  .then((value) => res.send(value))
})

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}`))