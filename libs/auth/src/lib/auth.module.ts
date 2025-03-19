import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthorizationService } from './authorization.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env['JWT_SECRET'] || 'supersecret',
        signOptions: {
          expiresIn: process.env['JWT_EXPIRES_IN'] || '7d',
        },
      }),
    }),
  ],
  providers: [AuthorizationService],
  exports: [PassportModule, JwtModule, AuthorizationService],
})
export class AuthModule {}
