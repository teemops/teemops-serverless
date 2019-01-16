'use strict';
//Teem objects
var tHttp=require('./lib/teem/http');

//jmes path query expressions
// use jms.search(inputdata, expression);
//useful for making nice readable output from aws sdk
var jms = require('jmespath');
// var async = require('asyncawait/async');
// var await = require('asyncawait/await');

//config
var config = require('config-json');
switch(process.env.MODE){
    case "prod":
        config.load('./conf/conf.prod.json');
        break;
    case "test":
        config.load('./conf/conf.test.json');
        break;
    case "dev":
        config.load('./conf/conf.json');
        break;
    default:
        config.load('./conf/conf.json');
}

var externalId=config.get("ExternalId");

//always load
var  AWS= require('aws-sdk');
var logger;
//AWS.config.update({region: 'ap-southeast-2'});
var ec2 = new AWS.EC2();
var sts= new AWS.STS();

const sessionName="Teemops_serverless";

/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file List VPC
 @package vpc
 */
module.exports.listVPC = (event, context, callback) => {
    var req=tHttp(event);

    console.log(JSON.stringify(event));

    function stsAssume(params){
        return function (callback) {
            return sts.assumeRole(params, callback);
        };
    }

    function describeVPCs(ec2Client, params){
        return function (callback) {
            return ec2Client.describeVpcs(params, callback);
        };
    }

    var returnResults=async (function(){

        //sts assume role
        var params={
            DurationSeconds: 900,
            RoleArn: req.body.RoleArn,
            ExternalId: externalId,
            RoleSessionName: sessionName
        };

        var data = await(stsAssume(params));
        console.log("stsAssume in VPC:"+JSON.stringify(data));
        //update credentials and config
        if (data.Credentials.length!==0) {
        
            AWS.config.update({
            accessKeyId:data.Credentials.AccessKeyId,
            secretAccessKey:data.Credentials.SecretAccessKey,
            sessionToken:data.Credentials.SessionToken,
            region:req.body.region
            });

            var ec2Client=new AWS.EC2();
            var params={};

            var describe = await(describeVPCs(ec2Client, params));
            return(describe);
        }else{
            return("Error Assuming Role");
        }

    });

    returnResults().then(function (data) {
        console.log(JSON.stringify(data));

        if (data.Vpcs.length!==0) {
            var output=jms.search(data, "Vpcs[].{ID: VpcId, IPRange: CidrBlock, Tags: Tags[*]}");
            var res=tHttp.res(output);
            callback(null, res);
        }else{
            callback(null, tHttp.res("No data found."));
        }

        

    }, function(err) {
        console.log(err);
        callback(tHttp.res(err), null);
    });
  
 
};

/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file List VPC
 @package amiManager
 */
module.exports.listSubnet = (event, context, callback) => {
    var req=tHttp(event);

    console.log(JSON.stringify(event));
    var params={
        DurationSeconds: 900,
        RoleArn: req.body.RoleArn,
        ExternalId: externalId,
        RoleSessionName: sessionName
    };
    sts.assumeRole(params, function(err, data){

        if (err) {
            callback(err, null);
        }else{
            if (data.Credentials.length!==0) {

                AWS.config.update({
                    accessKeyId:data.Credentials.AccessKeyId,
                    secretAccessKey:data.Credentials.SecretAccessKey,
                    sessionToken:data.Credentials.SessionToken,
                    region:req.body.region
                });
                var ec2Client=new AWS.EC2();
                var params={

                };
                /**
                 Describes AMIs available in this AWS account based on the filters provided
                 */
                ec2Client.describeSubnets(params, function(err, data) {
                    if (err) {
                        callback(err, null);
                    }else{
                        if (data.Subnets.length!==0) {
                            var output=jms.search(data, "Subnets[].{ID: SubnetId, IPRange: CidrBlock, VpcId: VpcId, AvailabilityZone: AvailabilityZone, Tags: Tags[*]}");
                            var res=tHttp.res(output);
                            callback(null, res);
                        }else{

                        }
                    }
                });


            }else{
                callback("Error Assuming Role", null);
            }
        }

    });


};

/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file List VPC
 @package amiManager
 */
module.exports.listSG = (event, context, callback) => {
    var req=tHttp(event);

    console.log(JSON.stringify(event));
    var params={
        DurationSeconds: 900,
        RoleArn: req.body.RoleArn,
        ExternalId: externalId,
        RoleSessionName: sessionName
    };
    sts.assumeRole(params, function(err, data){

        if (err) {
            callback(err, null);
        }else{
            if (data.Credentials.length!==0) {

                AWS.config.update({
                    accessKeyId:data.Credentials.AccessKeyId,
                    secretAccessKey:data.Credentials.SecretAccessKey,
                    sessionToken:data.Credentials.SessionToken,
                    region:req.body.region
                });
                var ec2Client=new AWS.EC2();
                var params={

                };
                /**
                 Describes AMIs available in this AWS account based on the filters provided
                 */
                ec2Client.describeSecurityGroups(params, function(err, data) {
                    if (err) {
                        callback(err, null);
                    }else{
                        if (data.SecurityGroups.length!==0) {
                            var output=jms.search(data, "SecurityGroups[].{ID: GroupId, Description: Description, VpcId: VpcId, Name: GroupName, Tags: Tags[*]}");
                            var res=tHttp.res(output);
                            callback(null, res);
                        }else{

                        }
                    }
                });


            }else{
                callback("Error Assuming Role", null);
            }
        }

    });


};
