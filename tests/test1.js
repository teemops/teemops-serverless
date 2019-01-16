#!/user/bin/env node

/*
var GlobalMessageKey;
console.log(typeof GlobalMessageKey);
if(typeof GlobalMessageKey==='undefined' || GlobalMessageKey===null){
    GlobalMessageKey='PLACEHOLDER';
}
console.log(GlobalMessageKey);

//var helper=require('./lib/teem/helper');
var test='{{output.Instances[0].InstanceId}}';
var newvalue=test.replace("{{", "");
newvalue=newvalue.replace("}}", "");


console.log(newvalue);

*/

var AWS= require('aws-sdk');
var async = require('asyncawait/async');
var await = require('asyncawait/await');
AWS.config.update({region: 'ap-northeast-2'});



var helper=require('../lib/teem/helper');
const fs = require('fs');
var path = require('path');
var jsonPath = path.join(__dirname, '..', 'tests', 'json', 'message.json');
var data=fs.readFileSync(jsonPath);

//console.log(data.toString());
var msg=JSON.parse(data.toString());
var tasks=msg.body.postTasks;
//console.log(tasks);


function getP(data, params){
    var filteredParams=params;
    var output=data;
    var newvalue=params.replace("\"{{", "");
    newvalue=newvalue.replace("}}\"", "");
    console.log("GETP:"+newvalue+"\n");
    var stringit='filteredParams="'+newvalue+'"';
    console.log(stringit);
    eval('filteredParams="'+newvalue+'"');
    console.log(filteredParams);
    return filteredParams;
}

function getFilterParams(data, params){
    var filteredParams=params;
    var output=data;
    for(var key in params){
      if(typeof(params[key])===Array){
        for(var i=0;i<params[key].length;i++){
          if(typeof(params[key][i])==='object'){
            for(var obj in params[key][i]){
              var objvalue=params[key][i][obj];
              var filter=helper.template(objvalue);
              eval('filteredParams.'+[key][i]+'.'+obj+'='+filter);
            }
          }else{
            var objvalue=params[key][i].toString();
            var filter=helper.template(objvalue);
            eval('filteredParams.'+[key][i]+'='+filter);
          }
          
        }
      }else{
        var filter=helper.template(params[key]);
        console.log('filteredParams.'+key+'='+JSON.stringify(filter));
        eval('filteredParams.'+key+'='+filter);
      }
      
    }
    return filteredParams;
  }

  var ec2Client=new AWS.EC2();
  
  function describe(){
      return function (callback) {
          return ec2Client.describeInstances("", callback); 
      };
  }
  
  var test=async (function(){ 
      var desc = await(describe());
      return desc;
  });
  
  test().then(function (result) {
    //console.log(result);
    var output=result;
    //var thisParams=getFilterParams(data, tasks[0].params);

    var otherParams=getP(data, JSON.stringify(tasks[0].params));
    console.log(otherParams);
  }, function(error) {
      console.log(error);
  });
  /*
  output={
      "Instances":[
          {
              "InstanceId":'i-523bjsd'
          }
      ]
  };
  output.Instances[0].InstanceId="asasasaas";
  console.log("EC2 Describe Output");
  console.log(output);
  console.log("ENDEC2 Describe Output");
  */
