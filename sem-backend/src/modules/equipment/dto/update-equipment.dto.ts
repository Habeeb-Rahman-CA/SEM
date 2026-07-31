import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsEnum(['available', 'booked', 'maintenance', 'retired'])
  status?: 'available' | 'booked' | 'maintenance' | 'retired';

  @IsOptional()
  @IsEnum(['new', 'good', 'fair', 'poor'])
  condition?: 'new' | 'good' | 'fair' | 'poor';

  @IsOptional()
  @IsString()
  purchaseDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
