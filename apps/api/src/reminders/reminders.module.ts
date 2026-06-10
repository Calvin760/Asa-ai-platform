// src/reminders/reminders.module.ts

import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [RemindersController],
    providers: [RemindersService],
    exports: [RemindersService], // AgentModule needs this
})
export class RemindersModule { }