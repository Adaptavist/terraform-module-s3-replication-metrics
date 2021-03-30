import { Context } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { FAILED, send, SUCCESS } from './cfnResponse';

const s3 = new S3();

export const handler = async (
    event: any,
    context: Context
) => {
    console.log(`Received : ${event.RequestType}`);

    if (event.RequestType !== 'Create' || event.RequestType !== 'Delete') {
        console.log('Returning prematurely as unsupported event type was requested');
        return;
    }

    if (!event || !event.ResourceProperties.bucket_name) {
        return handleError(event, context, { message: 'No bucket_name was specified. Cannot continue.' });
    }

    const bucketName = event.ResourceProperties.bucket_name;
    console.log(`bucketName : ${bucketName}`);

    try {
        const result = await s3.getBucketReplication({ Bucket: bucketName }).promise();
        if (result.ReplicationConfiguration) {
            const replicationConfiguration = result.ReplicationConfiguration;
            console.log(`Found the replication config : ${JSON.stringify(replicationConfiguration)}`);

            replicationConfiguration.Rules = replicationConfiguration.Rules.map(rule => {
                if (event.RequestType === 'Create') {
                    const rt: S3.ReplicationTime = {
                        Status: 'Enabled',
                        Time: {
                            Minutes: 15 // 15 mins is the only allowed value at the time of writing
                        }
                    };

                    const metrics: S3.Metrics = {
                        Status: 'Enabled',
                        EventThreshold: {
                            Minutes: 15 // 15 mins is the only allowed value at the time of writing
                        }
                    };

                    rule.Destination.ReplicationTime = rt;
                    rule.Destination.Metrics = metrics;
                    // switch to v2 version of API, we need this to get access to RTC
                    // https://stackoverflow.com/questions/61875010/is-there-a-way-to-enable-replicationconfiguration-for-aws-s3-replication-managem
                    rule.Filter = {
                        Prefix: rule.Prefix

                    };
                    rule.Priority = 1;
                    rule.DeleteMarkerReplication = {
                        Status: 'Enabled'
                    };
                    rule.Prefix = undefined; // remove old prefix as this is the v1 version of the API
                } else if (event.RequestType === 'Delete') {
                    rule.Destination.ReplicationTime = undefined;
                    rule.Destination.Metrics = undefined;
                }

                return rule;
            });
        } else {
            return handleError(event, context, { message: `Bucket had no replication configuration : ${bucketName}` });
        }

        const params: S3.PutBucketReplicationRequest = {
            Bucket: bucketName,
            ReplicationConfiguration: result.ReplicationConfiguration!
        };

        console.log(`Updating replication config : ${JSON.stringify(params)}`);
        const updateResult = await s3.putBucketReplication(params).promise();
        return handleSuccess(event, context, { updateResult });
    } catch (error) {
        console.error(error);
        return handleError(event, context, { error });
    }
};

const handleError = async (event: any, context: Context, cause: object) => {
    return send(event, context, FAILED, cause);
};

const handleSuccess = async (event: any, context: Context, data: object) => {
    return send(event, context, SUCCESS, data);
};
