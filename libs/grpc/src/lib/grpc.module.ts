import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

interface GrpcModuleOptions {
  name: string;
  protoPath: string;
  package: string;
  port?: number;
  host?: string;
}

@Module({})
export class GrpcModule {
  static register(options: GrpcModuleOptions): DynamicModule {
    return {
      module: GrpcModule,
      imports: [
        ClientsModule.register([
          {
            name: options.name,
            transport: Transport.GRPC,
            options: {
              package: options.package,
              protoPath: join(__dirname, 'protos', options.protoPath),
              url: `${options.host || 'localhost'}:${options.port || 5000}`,
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
