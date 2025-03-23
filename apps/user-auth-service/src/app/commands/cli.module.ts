import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { CommandFactory } from 'nest-commander';
import { CreateAdminCommand } from './create-admin.command';
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';
import { DatabaseModule } from '@forex-marketplace/database';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';

/**
 * Module for CLI commands
 * This module includes command handlers for administrative tasks
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    SharedUtilsModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'very-secret-key',
      signOptions: { expiresIn: process.env['JWT_EXPIRES_IN'] || '7d' },
    }),
  ],
  providers: [CreateAdminCommand, UserService],
})
export class CliModule {}
