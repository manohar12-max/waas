import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete } from '@nestjs/common';
import { CollegesService } from './colleges.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';

@Controller('colleges')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) { }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() createCollegeDto: any) {
    return this.collegesService.create(createCollegeDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async findAll() {
    return this.collegesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.collegesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() updateCollegeDto: any) {
    return this.collegesService.update(id, updateCollegeDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    return this.collegesService.remove(id);
  }
}
