import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Metadata accepted with the multipart upload — everything except the file
 * itself. `competitionId` / `matchId` scope the photo to a subset of the
 * event; both null means "event-level".
 */
export class CreateGalleryPhotoDto {
  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @IsOptional()
  @IsUUID()
  matchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;
}

export class UpdateGalleryPhotoDto {
  @IsOptional()
  @IsUUID()
  competitionId?: string | null;

  @IsOptional()
  @IsUUID()
  matchId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string | null;
}
