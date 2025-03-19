import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { LoginDto } from '../dtos/login.dto';
import {
  JwtAuthGuard,
  CurrentUser,
  Roles,
  RolesGuard,
} from '@forex-marketplace/auth';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user) {
    const userEntity = await this.userService.findById(user.id);
    const { password, ...result } = userEntity;
    return result;
  }

  // Admin user creation - requires admin access
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createAdmin(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser
  ) {
    return this.userService.createAdmin(createUserDto, currentUser);
  }

  // Promote existing user to admin - requires admin access
  @Post('promote/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async promoteToAdmin(
    @Param('userId') userId: string,
    @CurrentUser() currentUser
  ) {
    return this.userService.promoteToAdmin(userId, currentUser);
  }
}
