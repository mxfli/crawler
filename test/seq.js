//stack overflow error

var Seq = require('seq');
  var messages = [];

  for(var i=0; 3200>i; i++) {
   messages.push({id: i});
  }

  Seq(messages)
   .flatten()
   .seqEach(function(m) {
     this(null);
   })
   .seq(function() {
     console.log("All done.")
   })

//no stack overflow error
Seq(messages)
 .flatten()
 .seqEach(function(m) { 
   var self = this;
   Seq()
    .seq(function() {
      self(null)
    })
 })
 .seq(function() {
   console.log("All done.")
 })
