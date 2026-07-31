import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMedicalProfileDto {
  @IsNotEmpty()
  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  allergies?: string[];

  @IsOptional()
  chronicConditions?: string[];

  @IsOptional()
  medications?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(150)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  physicianName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  physicianPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsString()
  lastCheckupDate?: string;

  @IsOptional()
  @IsString()
  nextCheckupDate?: string;

  @IsOptional()
  @IsEnum(['fit', 'limited', 'unfit', 'injured'])
  fitnessLevel?: 'fit' | 'limited' | 'unfit' | 'injured';

  @IsOptional()
  @IsBoolean()
  clearedToPlay?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
