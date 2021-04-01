var __create = Object.create;
var __defProp = Object.defineProperty;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __markAsModule = (target) => __defProp(target, "__esModule", {value: true});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {get: all[name], enumerable: true});
};
var __exportStar = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, {get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable});
  }
  return target;
};
var __toModule = (module2) => {
  return __exportStar(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? {get: () => module2.default, enumerable: true} : {value: module2, enumerable: true})), module2);
};

// app.ts
__markAsModule(exports);
__export(exports, {
  handler: () => handler
});
var import_aws_sdk = __toModule(require("aws-sdk"));

// cfnResponse/index.ts
var SUCCESS = "SUCCESS";
var FAILED = "FAILED";
var send = async (event, context, responseStatus, responseData, error, physicalResourceId, noEcho) => {
  return new Promise((resolve, reject) => {
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: `See the details in CloudWatch Log Group ${context.logGroupName} Log Stream ${context.logStreamName}; response ${JSON.stringify(responseData)}`,
      PhysicalResourceId: physicalResourceId || context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      NoEcho: noEcho || false,
      Data: responseData
    });
    console.log("Response body:\n", responseBody);
    const https = require("https");
    const url = require("url");
    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: "PUT",
      headers: {
        "content-type": "",
        "content-length": responseBody.length
      }
    };
    const request = https.request(options, function(response) {
      console.log("Status code: " + response.statusCode);
      console.log("Status message: " + response.statusMessage);
      resolve();
    });
    request.on("error", function(error2) {
      console.log("send(..) failed executing https.request(..): " + error2);
      reject(error2);
    });
    request.write(responseBody);
    request.end();
  });
};

// app.ts
var AWS = require("aws-sdk");
var s3 = new import_aws_sdk.S3();
var handler = async (event, context) => {
  console.log(`Received : ${event.RequestType}`);
  if (!event || !event.ResourceProperties.bucket_name) {
    return handleError(event, context, {message: "No bucket_name was specified. Cannot continue."});
  }
  const bucketName = event.ResourceProperties.bucket_name;
  console.log(`bucketName : ${bucketName}`);
  try {
    return await s3.getBucketReplication({Bucket: bucketName}).promise().then(async (result) => {
      if (result.ReplicationConfiguration) {
        const replicationConfiguration = result.ReplicationConfiguration;
        console.log(`Found the replication config : ${JSON.stringify(replicationConfiguration)}`);
        replicationConfiguration.Rules.forEach((rule) => {
          let rt = {
            Status: "Enabled",
            Time: {
              Minutes: 15
            }
          };
          let metrics = {
            Status: "Enabled",
            EventThreshold: {
              Minutes: 15
            }
          };
          rule.Destination.ReplicationTime = rt;
          rule.Destination.Metrics = metrics;
          rule.Filter = {
            Prefix: rule.Prefix
          };
          rule.Priority = 1;
          rule.DeleteMarkerReplication = {
            Status: "Enabled"
          };
          rule.Prefix = void 0;
        });
      } else {
        return handleError(event, context, {message: `Bucket had no replication configuration : ${bucketName}`});
      }
      let params = {
        Bucket: bucketName,
        ReplicationConfiguration: result.ReplicationConfiguration
      };
      console.log(`Updating replication config : ${JSON.stringify(params)}`);
      const updateResult = await s3.putBucketReplication(params).promise();
      return handleSuccess(event, context, {updateResult});
    });
  } catch (error) {
    console.error(error);
    return handleError(event, context, {error});
  }
};
var handleError = async (event, context, cause) => {
  return send(event, context, FAILED, cause);
};
var handleSuccess = async (event, context, data) => {
  return send(event, context, SUCCESS, data);
};
