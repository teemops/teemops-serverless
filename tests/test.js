#!/user/bin/env node



var uuid = require('uuid/v4');
var helper=require('./../lib/teem/helper');
console.log(uuid());
var output={
	Reservations:[
		{
			Instances:[
				{
					InstanceId: "i-276b2323"
				}
			]
		},
		{
			Instances:[
				{
					InstanceId: "i-7623vuvad"
				}
			]
		}
	]
};
var s='{{output.Reservations.length===0}}';
s=helper.template(s);
console.log("S="+s);
//console.log(s.replace("/(-?\d+(?:\.\d*)?)F\b/g", ""));
var someValue=eval(s);
console.log(someValue);
var filteredParams=new Object;
for(key in output){
	console.log("\nkey "+ JSON.stringify(output[key]) +"\n");
	eval('filteredParams.'+key+'='+s);
}
console.log("\nfilteredParams "+filteredParams.Reservations);