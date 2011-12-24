var server = require('http');

var app = server.createServer(function (req, res) {
  res.writeHeader(200, {ContentType:'txt/plain'});
  console.log('cookies from request:', req.headers.cookie || "no cookie!!!");
  res.end("OK");
});

app.listen(8080);