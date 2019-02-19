import * as mqtt from 'mqtt';
import {Logger, MainInstance, Subscription, SubscriptionModel, SubscriptionProtocol} from 'enqueuer-plugins-template';

export class MqttSubscription extends Subscription {

    private client: any;
    private messageReceivedResolver?: (value?: (PromiseLike<any> | any)) => void;

    constructor(subscriptionAttributes: SubscriptionModel) {
        super(subscriptionAttributes);
        this.options = subscriptionAttributes.options || {};
        this.options.connectTimeout = this.options.connectTimeout || 10 * 1000;
    }

    public receiveMessage(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.client.connected) {
                reject(`Error trying to receive message. Subscription is not connected yet: ${this.topic}`);
            } else {
                Logger.debug('Mqtt message receiver resolver initialized');
                this.messageReceivedResolver = resolve;
            }
        });
    }

    public subscribe(): Promise<void> {
        return new Promise((resolve, reject) => {
            Logger.trace(`Mqtt connecting to broker ${this.brokerAddress}`);
            this.client = mqtt.connect(this.brokerAddress, this.options);
            Logger.trace(`Mqtt client created`);
            if (!this.client.connected) {
                this.client.on('connect', () =>  {
                    this.subscribeToTopic(reject, resolve);
                });
            } else {
                this.subscribeToTopic(reject, resolve);
            }
            this.client.on('error', (error: any) => {
                Logger.error(`Error subscribing to mqtt ${error}`);
                reject(error);
            });
        });
    }

    public async unsubscribe(): Promise<void> {
        if (this.client) {
            this.client.unsubscribe(this.topic);
            this.client.end(true);
        }
        delete this.client;
    }

    private subscribeToTopic(reject: Function, resolve: Function) {
        Logger.trace(`Mqtt subscribing on topic ${this.topic}`);
        this.client.subscribe(this.topic, (err: any) => {
            if (err) {
                reject(err);
            } else {
                Logger.trace(`Mqtt subscribed on topic ${this.topic}`);
                this.client.on('message', (topic: string, payload: string) => this.gotMessage(topic, payload));
                resolve();
            }
        });
    }

    private gotMessage(topic: string, payload: string) {
        Logger.debug('Mqtt got message');
        if (this.messageReceivedResolver) {
            this.messageReceivedResolver({topic: topic, payload: payload});
        } else {
            Logger.error('Mqtt message receiver resolver is not initialized');
        }
    }
}

export function entryPoint(mainInstance: MainInstance): void {
    const mqtt = new SubscriptionProtocol('mqtt',
        (subscriptionModel: SubscriptionModel) => new MqttSubscription(subscriptionModel),
        ['topic', 'payload'])
        .setLibrary('mqtt');
    mainInstance.protocolManager.addProtocol(mqtt);
}
