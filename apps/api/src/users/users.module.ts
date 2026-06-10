// src/users/users.module.ts

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ClinicModule } from '../clinic/clinic.module';

@Module({
    imports: [PrismaModule, ClinicModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService], // AppointmentsModule will need this
})
export class UsersModule { }