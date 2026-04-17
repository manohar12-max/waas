import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './users/user.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminEmail = 'admin@pixaflip.com';
  const adminPassword = 'adminPassword123'; // In production, this should be changed immediately

  const existingAdmin = await usersService.findByEmail(adminEmail);
  if (!existingAdmin) {
    await usersService.create({
      name: 'Pixaflip Root Admin',
      email: adminEmail,
      password: adminPassword,
      role: UserRole.SUPER_ADMIN,
    });
    console.log('Super Admin created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
  } else {
    console.log('Super Admin already exists.');
  }

  await app.close();
}
bootstrap();
