import * as subscription from './mqtt-subscription';
import * as publisher from './mqtt-publisher';
import {MainInstance} from 'enqueuer';

export function entryPoint(mainInstance: MainInstance): void {
    subscription.entryPoint(mainInstance);
    publisher.entryPoint(mainInstance);
}
