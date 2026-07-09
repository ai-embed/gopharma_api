import { PartialType } from '@nestjs/swagger';
import { CreateAdminMedicamentDto } from './create-admin-medicament.dto';

export class UpdateAdminMedicamentDto extends PartialType(CreateAdminMedicamentDto) {}
