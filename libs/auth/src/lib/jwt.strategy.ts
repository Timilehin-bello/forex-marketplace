import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env['JWT_SECRET'] || 'supersecret',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    roles?: string[];
    isAdmin?: boolean;
  }) {
    // Add validation logic - for example, rejecting inactive users
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // This will be attached to the request object
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      isAdmin: payload.isAdmin || false,
    };
  }
}
