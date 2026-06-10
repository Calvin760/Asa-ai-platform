// src/users/users.controller.ts

import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Public()
    @Post()
    create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto);
    }

    // GET /users?clinicId=xxx
    @Get()
    findAll(@Query('clinicId') clinicId: string) {
        return this.usersService.findAllByClinic(clinicId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    // Used by Clerk webhook to look up user on login
    @Public()
    @Get('clerk/:clerkUserId')
    findByClerkId(@Param('clerkUserId') clerkUserId: string) {
        return this.usersService.findByClerkId(clerkUserId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.update(id, dto);
    }

    // PATCH /users/:id/deactivate — no DELETE in a medical system
    @Patch(':id/deactivate')
    deactivate(@Param('id') id: string) {
        return this.usersService.deactivate(id);
    }
}