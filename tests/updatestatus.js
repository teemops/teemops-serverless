'use strict';
/*
Run example in cli:
# node tests/checkstatus.js | python -m json.tool
*/
//Teem objects
var tNotify=require('../lib/teem/notify');

var statusMsg={
    statusid:10,
    status:'STARTED',
    customerid:67
  };
  tNotify.setStatus(statusMsg, function(err, data){ 
    if(err){
      console.log("Status Update Error caused by: "+JSON.stringify(err));
    }else{
      console.log(JSON.stringify(data));
    }
  });





