import * as mqtt from 'async-mqtt';
import {PublisherProtocol, Publisher, InputPublisherModel as PublisherModel, Logger, MainInstance} from 'enqueuer';
import {AsyncMqttClient} from 'async-mqtt';

export class MqttPublisher extends Publisher {
    private readonly options: {};

    public constructor(publish: PublisherModel) {
        super(publish);
        this.options = publish.options || {};
    }

    public async publish(): Promise<void> {
        try {
            const client: AsyncMqttClient = await this.connectClient();
            this.executeHookEvent('onConnected');
            Logger.debug(`Mqtt publishing in ${this.brokerAddress} - ${this.topic}: ${this.payload}`
                .substr(0, 50).concat('...'));
            const toPublish = typeof this.payload == 'object' ? JSON.stringify(this.payload) : this.payload;
            await client.publish(this.topic, toPublish);
            this.executeHookEvent('onPublished');
            return client.end();
        } catch (err) {
            Logger.error(`Error publishing in ${this.brokerAddress} - ${this.topic}: ${err}`);
            throw err;

        }
    }

    private connectClient(): Promise<AsyncMqttClient> {
        return new Promise((resolve, reject) => {
            const client = mqtt.connect(this.brokerAddress, this.options);
            if (client.connected) {
                resolve(client);
            } else {
                client.on('connect', () => resolve(client));
            }
            client.on('error', (err: any) => {
                Logger.error(`Error connecting to publish to mqtt ${err}`);
                reject(err);
            });
        });
    }

}

export function entryPoint(mainInstance: MainInstance): void {
    const mqtt = new PublisherProtocol('mqtt',
        (publisherModel: PublisherModel) => new MqttPublisher(publisherModel), {
            description: 'Enqueuer plugin to handle mqtt messages',
            homepage: 'https://github.com/enqueuer-land/enqueuer-plugin-mqtt',
            libraryHomepage: 'https://github.com/mqttjs/async-mqtt',
            schema: {
                attributes: {
                    options: {
                        type: 'object',
                        required: true,
                        description: 'https://www.npmjs.com/package/mqtt#client'
                    },
                    brokerAddress: {
                        type: 'string',
                        required: true,
                    },
                    topic: {
                        type: 'string',
                        required: true,
                    },
                    payload: {
                        type: 'text',
                        required: true,
                    },
                },
                hooks: {
                    onPublished: {
                        arguments: {},
                    },
                    onConnected: {
                        arguments: {},
                    },
                }
            }
        })
        .setLibrary('async-mqtt ');
    mainInstance.protocolManager.addProtocol(mqtt);
}
