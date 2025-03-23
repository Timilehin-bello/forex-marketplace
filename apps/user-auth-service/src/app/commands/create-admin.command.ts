import { Command, CommandRunner, Option } from 'nest-commander';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { LoggerService } from '@forex-marketplace/shared-utils';

interface CreateAdminCommandOptions {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

@Command({
  name: 'create-admin',
  description: 'Create an admin user',
})
export class CreateAdminCommand extends CommandRunner {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggerService
  ) {
    super();
  }

  async run(
    passedParams: string[],
    options: CreateAdminCommandOptions
  ): Promise<void> {
    try {
      this.logger.log('Creating admin user...');

      // Create user with admin privileges
      const adminUser: CreateUserDto = {
        email: options.email,
        password: options.password,
        firstName: options.firstName,
        lastName: options.lastName,
        isAdmin: true,
        roles: ['ADMIN', 'SUPER_ADMIN'],
      };

      const result = await this.userService.register(adminUser);

      this.logger.log(
        `Admin user created successfully with email: ${result.user.email}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to create admin user: ${error.message}`,
        error.stack
      );
    }
  }

  @Option({
    flags: '-e, --email [email]',
    description: 'Admin email',
    required: true,
  })
  parseEmail(email: string): string {
    return email;
  }

  @Option({
    flags: '-p, --password [password]',
    description: 'Admin password',
    required: true,
  })
  parsePassword(password: string): string {
    return password;
  }

  @Option({
    flags: '-f, --firstName [firstName]',
    description: 'Admin first name',
    required: true,
  })
  parseFirstName(firstName: string): string {
    return firstName;
  }

  @Option({
    flags: '-l, --lastName [lastName]',
    description: 'Admin last name',
    required: true,
  })
  parseLastName(lastName: string): string {
    return lastName;
  }
}
