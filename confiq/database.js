const mongoose = require('mongoose')

const connectionString = process.env.DATABASE

mongoose.connect(connectionString).then((res)=>{
    console.log(`mongodb connected`);
    
}).catch((err)=>{
    console.log('failed');
    
})