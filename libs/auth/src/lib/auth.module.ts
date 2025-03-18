import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

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
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
