import * as mqtt from 'async-mqtt';
import {Logger, MainInstance, Subscription, InputSubscriptionModel as SubscriptionModel, SubscriptionProtocol} from 'enqueuer';
import {AsyncMqttClient} from 'async-mqtt';

export class MqttSubscription extends Subscription {

    private client?: AsyncMqttClient;
    private messageReceivedResolver?: (value?: (PromiseLike<any> | any)) => void;
    private readonly options: any;

    constructor(subscriptionAttributes: SubscriptionModel) {
        super(subscriptionAttributes);
        this.options = subscriptionAttributes.options || {};
        this.options.connectTimeout = this.options.connectTimeout || 10 * 1000;
    }

    public receiveMessage(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.client!.connected) {
                reject(`Error trying to receive message. Subscription is not connected yet: ${this.topic}`);
            } else {
                Logger.debug('Mqtt message receiver resolver initialized');
                this.messageReceivedResolver = resolve;
            }
        });
    }

    public subscribe(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            Logger.trace(`Mqtt connecting to broker ${this.brokerAddress}`);
            this.client = mqtt.connect(this.brokerAddress, this.options);
            Logger.trace(`Mqtt client created`);
            if (!this.client.connected) {
                this.client.on('connect', async () => {
                    await this.subscribeToTopic(reject, resolve);
                });
            } else {
                await this.subscribeToTopic(reject, resolve);
            }
            this.client.on('error', (error: any) => {
                Logger.error(`Error subscribing to mqtt ${error}`);
                reject(error);
            });
        });
    }

    public async unsubscribe(): Promise<void> {
        if (this.client) {
            await this.client.unsubscribe(this.topic);
            await this.client.end(true);
        }
        delete this.client;
    }

    private async subscribeToTopic(reject: Function, resolve: Function) {
        this.executeHookEvent('onConnected');
        Logger.trace(`Mqtt subscribing on topic ${this.topic}`);
        try {
            await this.client!.subscribe(this.topic);
            this.executeHookEvent('onSubscribed');
            Logger.trace(`Mqtt subscribed on topic ${this.topic}`);
            this.client!.on('message', (topic: string, payload: string) => this.gotMessage(topic, payload));
            resolve();
        } catch (err) {
            reject(err);

        }
    }

    private gotMessage(topic: string, payload: string) {
        Logger.debug('Mqtt got message');
        if (this.messageReceivedResolver) {
            this.executeHookEvent('onMessageReceived', {topic: topic, payload: payload});
            this.messageReceivedResolver();
        } else {
            Logger.error('Mqtt message receiver resolver is not initialized');
        }
    }
}

export function entryPoint(mainInstance: MainInstance): void {
    const mqtt = new SubscriptionProtocol('mqtt',
        (subscriptionModel: SubscriptionModel) => new MqttSubscription(subscriptionModel),
        {
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
                },
                hooks: {
                    onMessageReceived: {
                        arguments: {
                            topic: {},
                            payload: {}
                        },
                    },
                    onSubscribed: {
                        arguments: {},
                    },
                    onConnected: {
                        arguments: {},
                    },
                }
            }
        }).setLibrary('async-mqtt');
    mainInstance.protocolManager.addProtocol(mqtt);
}
