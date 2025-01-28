require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser');

// route
const routes = require('./routes/route')
// connect mongodb
require('./confiq/database')

// create server
const QRServer = express()
QRServer.use(bodyParser.json());
QRServer.use(express.json())
QRServer.use(cors())
QRServer.use(routes)


const PORT = 5000 || process.env.PORT

QRServer.listen(PORT,()=>{
    console.log(`server running at ${PORT}`);
    
})

// QRServer.get('/',(req,res)=>{
//     res.send('get request is working')
// })