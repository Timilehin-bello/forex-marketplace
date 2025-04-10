import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '5432', 10),
        username: process.env['DB_USERNAME'] || 'postgres',
        password: process.env['DB_PASSWORD'] || 'postgres',
        database: process.env['DB_DATABASE'] || 'forex',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: process.env['NODE_ENV'] !== 'production',
        logging: process.env['NODE_ENV'] !== 'production',
        autoLoadEntities: true,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
