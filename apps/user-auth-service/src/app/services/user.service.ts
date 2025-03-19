import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { LoginDto } from '../dtos/login.dto';
import { LoggerService } from '@forex-marketplace/shared-utils';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService
  ) {}

  async register(
    createUserDto: CreateUserDto
  ): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const { email, password } = createUserDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      this.logger.error(`User with email ${email} already exists`);
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateToken(savedUser);

    // Exclude password from response
    const { password: _, ...userWithoutPassword } = savedUser;

    return { user: userWithoutPassword, token };
  }

  async createAdmin(
    createUserDto: CreateUserDto,
    currentUser: User
  ): Promise<{ user: Omit<User, 'password'>; token: string }> {
    // Verify the user making the request is an admin
    if (!currentUser.isAdmin) {
      this.logger.error(
        `Non-admin user ${currentUser.id} attempted to create admin`
      );
      throw new ForbiddenException('Only admins can create other admin users');
    }

    // Set admin flag
    createUserDto.isAdmin = true;

    // Assign admin role if not provided
    if (!createUserDto.roles || createUserDto.roles.length === 0) {
      createUserDto.roles = ['ADMIN'];
    } else if (!createUserDto.roles.includes('ADMIN')) {
      createUserDto.roles.push('ADMIN');
    }

    this.logger.log(`Admin user creating new admin: ${createUserDto.email}`);
    return this.register(createUserDto);
  }

  async promoteToAdmin(
    userId: string,
    currentUser: User
  ): Promise<Omit<User, 'password'>> {
    // Verify the user making the request is an admin
    if (!currentUser.isAdmin) {
      this.logger.error(
        `Non-admin user ${currentUser.id} attempted to promote user to admin`
      );
      throw new ForbiddenException('Only admins can promote users to admin');
    }

    const user = await this.findById(userId);

    // Already an admin
    if (user.isAdmin) {
      return this.excludePassword(user);
    }

    // Update user to be an admin
    user.isAdmin = true;

    // Add admin role if it doesn't exist
    if (!user.roles) {
      user.roles = ['ADMIN'];
    } else if (!user.roles.includes('ADMIN')) {
      user.roles.push('ADMIN');
    }

    this.logger.log(`Promoting user ${userId} to admin by ${currentUser.id}`);
    const savedUser = await this.userRepository.save(user);
    return this.excludePassword(savedUser);
  }

  async login(
    loginDto: LoginDto
  ): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.error(`User with email ${email} not found`);
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.error(`Invalid password for user ${email}`);
      throw new NotFoundException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Exclude password from response
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.error(`User with id ${id} not found`);
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.error(`User with email ${email} not found`);
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      roles: user.roles,
    };
    return this.jwtService.sign(payload);
  }

  private excludePassword(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
