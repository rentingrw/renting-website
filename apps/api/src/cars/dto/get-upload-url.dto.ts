import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export class GetUploadUrlDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  folder?: string;

  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_MIME_TYPES, {
    message: `Only image files are allowed (${ALLOWED_MIME_TYPES.join(', ')}).`,
  })
  contentType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES, {
    message: `File size must not exceed ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
  })
  fileSize?: number;
}
