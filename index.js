const app = require('./server/config/express');
require('dotenv').config()


//DESTRUCTURE ENV VARIABLES WITH DEFAULT VALUES
const {PORT = 3000} = process.env
app.listen(PORT,()=>{
    console.log(`Server is listening to port ${PORT}`);
});

module.exports;