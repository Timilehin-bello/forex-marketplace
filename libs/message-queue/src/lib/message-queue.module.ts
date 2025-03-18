import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

interface RmqModuleOptions {
  name: string;
  queue: string;
}

@Module({})
export class MessageQueueModule {
  static register(options: RmqModuleOptions): DynamicModule {
    return {
      module: MessageQueueModule,
      imports: [
        ClientsModule.register([
          {
            name: options.name,
            transport: Transport.RMQ,
            options: {
              urls: [process.env['RABBITMQ_URL'] || 'amqp://localhost:5672'],
              queue: options.queue,
              queueOptions: {
                durable: true,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
