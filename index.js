// Place your server entry point code here
// Serve static HTML files
// imports
import { coinFlip } from './modules/coin.mjs';
import { coinFlips } from './modules/coin.mjs';
import { countFlips } from './modules/coin.mjs';
import { flipACoin } from './modules/coin.mjs';
import minimist from 'minimist';
import express from 'express';
import db from './src/services/database.js';
import fs from 'fs';
import morgan from 'morgan';

// Require Express.js
const app = express()
app.use(express.static('./public'));

// Require minimist module
const args = minimist(process.argv.slice(2))
// See what is stored in the object produced by minimist
console.log(args)

// Store help text 
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)

app.use( (req, res, next) => {
  // Your middleware goes here.
  let logdata = {
    remoteaddr: req.ip,
    remoteuser: req.user,
    time: Date.now(),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    httpversion: req.httpVersion,
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
  }
  const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referrer, logdata.useragent)
  //console.log(info)
  next();
})

// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

if (args.log == 'false') {
  console.log("Not creating access.log")
} else {
  const logdir = './log/';

  if (!fs.existsSync(logdir)){
      fs.mkdirSync(logdir);
  }
  const accessLog = fs.createWriteStream( logdir+'access.log', { flags: 'a' })
  app.use(morgan('combined', { stream: accessLog }))
}

var argv = minimist(process.argv.slice(2));
var port = argv['port'] || 5555;
//args["port"]
//const port = process.env.PORT || 5000
// Start an app server
const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

app.get('/app/', (req, res) => {
    // Respond with status 200
        res.statusCode = 200;
    // Respond with status message "OK"
        res.statusMessage = 'OK';
        res.writeHead( res.statusCode, { 'Content-Type' : 'text/plain' });
        res.end(res.statusCode+ ' ' +res.statusMessage)
    });

app.get('/app/flip', (req, res) => {
    res.setHeader('Content-Type', 'text/html')
    // Call the coinFlip function and put the return into STDOUT
    let STDOUT = coinFlip();
    res.end("{\"flip\":" + "\"" + STDOUT + "\"" + "}")
});

app.get('/app/flips/:number', (req, res) => {
  res.setHeader('Content-Type', 'text/html')
  
  ///// from a02
  const numOfFlips = coinFlips(req.params.number);

  // Call the coinFlip function and put the return into STDOUT
  let str1 = JSON.stringify(numOfFlips)
  let second = countFlips(numOfFlips);
  let str = JSON.stringify(second)
  //console.log(str1);
  res.end("{\"raw\":" + str1 + ",\"summary\":" + str + "}");
});

app.get('/app/flip/call/heads', (req, res) => {
  res.setHeader('Content-Type', 'text/html')

  // a02
  let STDOUT = flipACoin("heads");
  res.json(STDOUT);
});

app.get('/app/flip/call/tails', (req, res) => {
  res.setHeader('Content-Type', 'text/html')

  // a02
  let STDOUT = flipACoin("tails");
  res.json(STDOUT);
});

if (args.debug || args.d) {
  app.get('/app/log/access/', (req, res, next) => {
      const stmt = db.prepare("SELECT * FROM accesslog").all();
      console.log(stmt);
    res.status(200).json(stmt);
  })

  app.get('/app/error/', (req, res, next) => {
      throw new Error('Error test works.')
  })
}

// Default response for any other request
app.use(function(req, res){
  res.status(404).send('404 NOT FOUND')
});