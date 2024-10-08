const cluster = require('cluster');
const os = require('os');
const http = require('node:http');

const totalCPU = os.cpus().length;
console.log(totalCPU);
// if this is main servers
if (cluster.isPrimary) {
    // creating sub servers clusters base on count of CPU cores
    for (let i = 0; i < totalCPU; i++) {
        cluster.fork();
      }
}
else{
 // if its not primary server creating one here 
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`hello world\n ${process.pid}`);
  }).listen(8000);

  console.log(`Worker ${process.pid} started`);
}