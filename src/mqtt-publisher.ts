import * as mqtt from 'mqtt';
import {PublisherProtocol, Publisher, PublisherModel, Logger, MainInstance} from 'enqueuer-plugins-template';

export class MqttPublisher extends Publisher {

    public constructor(publish: PublisherModel) {
        super(publish);
        this.options = this.options || {};
    }

    public publish(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connectClient()
                .then(client => {
                    Logger.debug(`Mqtt publishing in ${this.brokerAddress} - ${this.topic}: ${this.payload}`
                        .substr(0, 100).concat('...'));
                    const toPublish = typeof this.payload == 'object' ? JSON.stringify(this.payload) : this.payload;
                    client.publish(this.topic, toPublish, (err: any) => {
                        if (err) {
                            Logger.error(`Error publishing in ${this.brokerAddress} - ${this.topic}: ${err}`);
                            reject(err);
                        }
                    });
                    client.end();
                    resolve();
                });
        });
    }

    private connectClient(): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = mqtt.connect(this.brokerAddress, this.options);
            if (client.connected) {
                resolve(client);
            } else {
                client.on('connect', () =>  resolve(client));
            }
            client.on('error', (err: any) =>  {
                Logger.error(`Error connecting to publish to mqtt ${err}`);
                reject(err);
            });
        });
    }

}

export function entryPoint(mainInstance: MainInstance): void {
    const mqtt = new PublisherProtocol('mqtt',
        (publisherModel: PublisherModel) => new MqttPublisher(publisherModel))
        .setLibrary('mqtt');
    mainInstance.protocolManager.addProtocol(mqtt);
}
