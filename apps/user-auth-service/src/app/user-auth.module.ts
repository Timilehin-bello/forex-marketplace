import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserGrpcController } from './grpc/user-grpc.controller';
import { DatabaseModule } from '@forex-marketplace/database';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { JwtStrategy } from '@forex-marketplace/auth';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    SharedUtilsModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'very-secret-key',
      signOptions: { expiresIn: process.env['JWT_EXPIRES_IN'] || '7d' },
    }),
  ],
  controllers: [UserController, UserGrpcController],
  providers: [UserService, JwtStrategy],
  exports: [UserService],
})
export class UserAuthModule {}
