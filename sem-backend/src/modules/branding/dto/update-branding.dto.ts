import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;

  @IsOptional() @IsString() @MaxLength(100) brandName?: string | null;
  @IsOptional() @IsString() @MaxLength(200) tagline?: string | null;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(500) faviconUrl?: string | null;

  @IsOptional() @IsString() @MaxLength(30) primaryColor?: string | null;
  @IsOptional() @IsString() @MaxLength(30) secondaryColor?: string | null;
  @IsOptional() @IsString() @MaxLength(30) accentColor?: string | null;

  @IsOptional() @IsString() @MaxLength(200) customDomain?: string | null;

  @IsOptional() @IsString() @MaxLength(2000) loginMessage?: string | null;
  @IsOptional() @IsString() @MaxLength(500) loginBackgroundUrl?: string | null;

  @IsOptional() @IsString() @MaxLength(100) emailFromName?: string | null;
  @IsOptional() @IsString() @MaxLength(200) emailFromAddress?: string | null;
  @IsOptional() @IsString() @MaxLength(10_000) emailHeaderHtml?: string | null;
  @IsOptional() @IsString() @MaxLength(10_000) emailFooterHtml?: string | null;

  @IsOptional() @IsString() @MaxLength(10_000) pdfHeaderHtml?: string | null;
  @IsOptional() @IsString() @MaxLength(10_000) pdfFooterHtml?: string | null;

  @IsOptional()
  @IsObject()
  socialLinks?: {
    website?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
  };
}
