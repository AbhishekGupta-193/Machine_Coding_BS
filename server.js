const express = require('express');
const http = require('http');

//creating http server
const app = express();
const server = http.createServer(app);

//Log file path added
const path = require('path');
const PATH_OF_LOG_FILE = path.join(__dirname,'test.log');

//PORT on which server will run
const PORT = process.env.PORT || 3001;

//Function to automatically create log file if it does not exists
const fs = require('fs').promises;
async function createLogFile() {
    try{
        await fs.access(PATH_OF_LOG_FILE);
    }
    catch{
        await fs.writeFile(PATH_OF_LOG_FILE,'');
    }
}

const Watcher = require('./watcher.js');

async function  init() {
    await createLogFile();

    //Initializing the watcher and socket.io service 
    const watcher =  new Watcher(server,PATH_OF_LOG_FILE);
    await watcher.init();

    server.listen(PORT,()=>{
        console.log(`server started running on port ${PORT}`);
    })
}


app.use(express.static(path.join(__dirname,'Template')));

app.get('/log',(req,res)=>{
    console.log("getting datas");
    res.sendFile(path.join(__dirname,'Template','index.html'));
})

init();

