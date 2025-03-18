import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MessageQueueService {
  constructor(private client: ClientProxy) {}

  async publish(pattern: string, data: any): Promise<void> {
    await this.client.emit(pattern, data).toPromise();
  }

  async send(pattern: string, data: any): Promise<any> {
    return this.client.send(pattern, data).toPromise();
  }
}
