import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock the bcrypt.hash and bcrypt.compare functions
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockUser = {
    id: 'test-id',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isAdmin: false,
    roles: ['USER'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithoutPassword = {
    id: 'test-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isAdmin: false,
    roles: ['USER'],
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  const mockAdmin = {
    ...mockUser,
    id: 'admin-id',
    email: 'admin@example.com',
    isAdmin: true,
    roles: ['ADMIN'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-token'),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      roles: ['USER'],
    };

    it('should register a new user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        password: 'hashedPassword',
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUserWithoutPassword,
        token: 'test-token',
      });
    });

    it('should throw ConflictException if user with email already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUserWithoutPassword,
        token: 'test-token',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should throw NotFoundException if password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('test-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('createAdmin', () => {
    const createAdminDto = {
      email: 'newadmin@example.com',
      password: 'admin123',
      firstName: 'New',
      lastName: 'Admin',
      roles: [],
      isAdmin: undefined,
    };

    it('should create a new admin user', async () => {
      const registerSpy = jest.spyOn(service, 'register').mockResolvedValue({
        user: mockUserWithoutPassword,
        token: 'test-token',
      });

      const result = await service.createAdmin(createAdminDto, mockAdmin);

      expect(createAdminDto.isAdmin).toBe(true);
      expect(createAdminDto.roles).toContain('ADMIN');
      expect(registerSpy).toHaveBeenCalledWith(createAdminDto);
      expect(result).toEqual({
        user: mockUserWithoutPassword,
        token: 'test-token',
      });
    });

    it('should throw ForbiddenException if non-admin tries to create admin', async () => {
      await expect(service.createAdmin(createAdminDto, mockUser)).rejects.toThrow(ForbiddenException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('promoteToAdmin', () => {
    it('should promote a user to admin', async () => {
      const userToPromote = { ...mockUser };
      const promotedUser = { ...mockUser, isAdmin: true, roles: ['USER', 'ADMIN'] };
      
      jest.spyOn(service, 'findById').mockResolvedValue(userToPromote);
      userRepository.save.mockResolvedValue(promotedUser);

      const result = await service.promoteToAdmin('test-id', mockAdmin);

      expect(service.findById).toHaveBeenCalledWith('test-id');
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: promotedUser.id,
        email: promotedUser.email,
        firstName: promotedUser.firstName,
        lastName: promotedUser.lastName,
        isActive: promotedUser.isActive,
        isAdmin: true,
        roles: ['USER', 'ADMIN'],
        createdAt: promotedUser.createdAt,
        updatedAt: promotedUser.updatedAt,
      });
    });

    it('should throw ForbiddenException if non-admin tries to promote', async () => {
      await expect(service.promoteToAdmin('test-id', mockUser)).rejects.toThrow(ForbiddenException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });
}); 