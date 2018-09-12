# Blockchain Notary service
In this project a blockchain based service is implemented that allows a user to register a star to a blockchain. The user is intially validated by the service, using their address Id (similar to a wallet) and as ling as the succeedd they are allowed to add a new entry. The entry is becoming part of the chain and there is the possiblity to lookup for a star by user address, by hash or by block height.The required steps are explained in details in the following sections.  

## Blockchain ID validation routine
The validation routine consists of two steps. First the Web API post endpoint validates request with JSON response and as long as it is successful the Web API post endpoint validates message signature with JSON response. 

### Web API post endpoint validation
The user is initiating the validation process by sending a post request with his addresss, like the following example (I am using Electrum to get the address):
```curl
POST http://localhost:8000/requestValidation
Content-Type: application/json
{
  "address": "12gpLBBzJPi9Uog9wrFeV2amS6o6E8MhrQ"
}
```

The service is calculating the time of the request, inititalizes the validation window to 5 minutes (300 seconds) and composes a message to be signed that has the following format:

`
Message format = [walletAddress]:[timeStamp]:starRegistry
`
The example response is the following one:
```json
{"address":"12gpLBBzJPi9Uog9wrFeV2amS6o6E8MhrQ","requestTimeStamp":"1536787211","message":"12gpLBBzJPi9Uog9wrFeV2amS6o6E8MhrQ:1536787211:starRegistry","validationWindow":300}
}
```

That response is also saved in a local dictionary variable as it is necessary to perform operations on it in later steps. The key to the dictionary is the address. 

The user is allowed one validation request within the validation window. If more requests are made the validation Window time is reduced untill it expires and user needs to reinitiate the process. 

### Web API post endpoint message signature validation
The second part of the validation routine is that the user within the available time window is sending the signature of the message generated in the previous step. An post example is like the one below:

```curl
POST http://localhost:8000/message-signature/validate
Content-Type: application/json
{
    "address": "12gpLBBzJPi9Uog9wrFeV2amS6o6E8MhrQ",
    "signature": "IDOU79IJ3r8yJtWeHk8kzRI6V1taiHHO7WXQyXqQjpCnJrb0JFQcfW3OTnNXuxqCfU/M6tAQJwqaBw0739bV+x0="
}
```

The endpoint is using the bitcoin library to verify the signature and checks that the validation window is not expired. In this case the response has the following format:

```json
{"registerStar":true,"status":{"address":"12gpLBBzJPi9Uog9wrFeV2amS6o6E8MhrQ","requestTimeStamp":"1536787211","message":"12gpLBBzJPi9Uog9wrFeV2amS6o6E8MhrQ:1536787211:starRegistry","validationWindow":223,"messageSignature":"valid"}}
```
Again this response is saved for the next steps of the service.

## Star registration Endpoint
A post request is submitted with the star to be registered in JSON format. 

```curl
POST http://localhost:8000/block
Content-Type: application/json
{
  "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
  "star": {
    "dec": "-26° 29' 24.9",
    "ra": "16h 29m 1.0s",
    "story": "Found star using https://www.google.com/sky/"
  }
}
```

The node submits the entry to the blockchain. The story field is encoded. Therefore the response would look like:


```json
{
  "hash": "a59e9e399bc17c2db32a7a87379a8012f2c8e08dd661d7c0a6a4845d4f3ffb9f",
  "height": 1,
  "body": {
    "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
    "star": {
      "ra": "16h 29m 1.0s",
      "dec": "-26° 29' 24.9",
      "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f"
    }
  },
  "time": "1532296234",
  "previousBlockHash": "49cce61ec3e6ae664514d5fa5722d86069cf981318fc303750ce66032d0acff3"
}
```

## Star Lookup
This operation return one or more stars as a response. The story should be decoded to ascii. This set of request is scanning the blockchain to find a match according to the criteria. 

### Get star block by hash with JSON response.
The format of the request is:
```curl
POST "http://localhost:8000/stars/hash:[hashId]]"
```
The response, if it exists one, is a single element

### Get star block by wallet address (blockchain identity) with JSON response.
```curl
POST "http://localhost:8000/stars/address:[addressId]]"
```
The response can return more than one elements as it is possible the user in the query has multiple submissions. 


### Get star block by star block height with JSON response.
The response, if it exists one, is a single element
```curl
POST "http://localhost:8000/stars/block/[blockId]"
```