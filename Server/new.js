var http = require('http');

http.createServer(function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.send('Hello World from 呵呵');
}).listen(3000);

console.log('Server stated on localhost:3000; press Ctrl-C to terminate....');