#!/user/bin/env node

var AWS= require('aws-sdk');
// var async = require('asyncawait/async');
// var await = require('asyncawait/await');
AWS.config.update({region: 'ap-southeast-2'});

var ec2Client=new AWS.EC2();

function describe(){
    return function (callback) {
        return ec2Client.describeInstances("sdsd", callback); 
    };
}

var test=async (function(){ 
    var desc = await(describe());
    return desc;
});

test().then(function (result) {
    console.log(result);
}, function(error) {
    console.log(error);
});
