/* ===== REst Functions =======================
|  Functions to operate on a LevelDB  			   |
|  ===============================================*/

const express = require('express')
const app = express()
var Blockchain = require('./simpleChain.js')
app.use(express.json())
const PORT  = 8000;

let blockchain = new Blockchain();

app.get('/', (req, res) => res.send('Welcome to my blockchain!'))

app.get('/block/:id', (req, res) => {
  let blockHeight = Number(req.params.id)
  blockchain.getBlock(blockHeight).then(function(block){
  console.log(block)
  res.send(block)
  })
  // Add error handler
})

app.post('/block', (req,res) => {
  console.log("POST on port 8000")
  blockchain.addBlock(new Block(req.body["body"])).then(console.log('Added new block'))

})

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}`))