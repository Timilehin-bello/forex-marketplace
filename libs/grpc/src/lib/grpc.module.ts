import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { existsSync } from 'fs';

interface GrpcModuleOptions {
  name: string;
  protoPath: string; // Can be relative or absolute path
  package: string;
  url?: string; // Allow specifying full URL directly
  port?: number; // Only used if url is not provided
  host?: string; // Only used if url is not provided
  maxSendMessageLength?: number;
  maxReceiveMessageLength?: number;
  channelOptions?: Record<string, any>;
  loaderOptions?: Record<string, any>;
  additionalOptions?: Record<string, any>;
}

@Module({})
export class GrpcModule {
  static register(options: GrpcModuleOptions): DynamicModule {
    const {
      name,
      protoPath,
      package: packageName,
      host = 'localhost',
      port = 5001,
      url,
      maxSendMessageLength,
      maxReceiveMessageLength,
      channelOptions = {},
      loaderOptions = {},
      additionalOptions = {},
    } = options;

    // Determine if protoPath is absolute or relative
    let fullProtoPath = protoPath;
    if (!protoPath.startsWith('/')) {
      // It's a relative path, so look in standard locations
      const possiblePaths = [
        join(process.cwd(), 'libs/grpc/src/lib/protos', protoPath),
        join(process.cwd(), 'dist/libs/grpc/protos', protoPath),
      ];
      
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          fullProtoPath = path;
          break;
        }
      }
    }
    
    // Verify proto file exists
    if (!existsSync(fullProtoPath)) {
      console.warn(`Warning: Proto file not found at ${fullProtoPath}`);
    }

    // Use url if provided, otherwise construct from host:port
    const serviceUrl = url || `${host}:${port}`;

    // Prepare the options object for the gRPC client
    const grpcOptions: any = {
      package: packageName,
      protoPath: fullProtoPath,
      url: serviceUrl,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        ...loaderOptions,
      },
      ...additionalOptions,
    };

    // Add optional parameters only if they are provided
    if (maxSendMessageLength) {
      grpcOptions.maxSendMessageLength = maxSendMessageLength;
    }
    
    if (maxReceiveMessageLength) {
      grpcOptions.maxReceiveMessageLength = maxReceiveMessageLength;
    }
    
    if (Object.keys(channelOptions).length > 0) {
      grpcOptions.channelOptions = channelOptions;
    }

    return {
      module: GrpcModule,
      imports: [
        ClientsModule.register([
          {
            name,
            transport: Transport.GRPC,
            options: grpcOptions,
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
