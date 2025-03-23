import { CommandFactory } from 'nest-commander';
import { CliModule } from './app/commands/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule, ['warn', 'error']);
}

bootstrap();
