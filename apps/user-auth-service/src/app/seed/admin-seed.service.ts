import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoggerService } from '@forex-marketplace/shared-utils';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService
  ) {}

  /**
   * Creates the initial admin user if no admin exists in the database
   * This runs when the application starts
   */
  async onModuleInit() {
    try {
      await this.seedAdminUser();
    } catch (error) {
      this.logger.error(
        `Failed to seed admin user: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Create a default admin user if no admin exists
   * Admin credentials are read from environment variables
   */
  private async seedAdminUser() {
    // Check if any admin user exists
    const adminCount = await this.userRepository.count({
      where: { isAdmin: true },
    });

    // If admin already exists, skip seeding
    if (adminCount > 0) {
      this.logger.log('Admin user already exists, skipping seed');
      return;
    }

    // Get admin credentials from environment variables or use defaults
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@forex-marketplace.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminFirstName = process.env.ADMIN_FIRSTNAME || 'Super';
    const adminLastName = process.env.ADMIN_LASTNAME || 'Admin';

    // Check if email is already in use
    const existingUser = await this.userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingUser) {
      this.logger.log(
        `User with email ${adminEmail} already exists, promoting to admin`
      );
      // Update existing user to be an admin
      existingUser.isAdmin = true;
      existingUser.roles = ['ADMIN', 'SUPER_ADMIN'];
      await this.userRepository.save(existingUser);
      this.logger.log(`User ${adminEmail} promoted to admin`);
      return;
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = this.userRepository.create({
      email: adminEmail,
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      isAdmin: true,
      roles: ['ADMIN', 'SUPER_ADMIN'],
      isActive: true,
    });

    await this.userRepository.save(adminUser);
    this.logger.log(`Initial admin user created with email: ${adminEmail}`);
  }
}
