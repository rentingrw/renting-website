import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PLACEHOLDER_VALUES = new Set([
  'your-cloud-name',
  'your-cloudinary-api-key',
  'your-cloudinary-api-secret',
]);

export type UploadConfigResponse = {
  uploadUrl: string;
  fields: Record<string, string | number>;
  provider: 'cloudinary' | 'local';
};

@Injectable()
export class ImageUploadService {
  getUploadConfig(folder: string | undefined, options?: { admin?: boolean }): UploadConfigResponse {
    const cloudinary = this.readCloudinaryConfig();
    if (cloudinary) {
      return { ...this.cloudinarySignedUpload(folder, cloudinary), provider: 'cloudinary' };
    }

    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Cloudinary configuration is incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the API environment (see .env.example).',
      );
    }

    const base = this.apiPublicBaseUrl();
    const path = options?.admin ? '/admin/uploads/direct' : '/uploads/direct';
    return {
      uploadUrl: `${base}${path}`,
      fields: {},
      provider: 'local',
    };
  }

  async saveLocalDevFile(file: Express.Multer.File): Promise<{ secure_url: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No image file received.');
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    const mime = file.mimetype || 'application/octet-stream';
    if (!allowed.has(mime)) {
      throw new BadRequestException('Only JPG, PNG, WEBP, or HEIC images are allowed.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Image must be 10 MB or smaller.');
    }

    const ext =
      mime === 'image/png'
        ? '.png'
        : mime === 'image/webp'
          ? '.webp'
          : mime === 'image/heic' || mime === 'image/heif'
            ? '.heic'
            : '.jpg';

    const dir = this.localUploadRoot();
    mkdirSync(dir, { recursive: true });
    const filename = `${randomUUID()}${ext}`;
    await writeFile(join(dir, filename), file.buffer);

    return { secure_url: `${this.apiPublicBaseUrl()}/dev-media/${filename}` };
  }

  /** Exposed for static file serving in main.ts */
  localUploadRoot(): string {
    const monorepoRoot = join(process.cwd(), '..', '..');
    const fromMonorepo = join(monorepoRoot, '.local-uploads');
    if (existsSync(join(monorepoRoot, 'pnpm-workspace.yaml')) || existsSync(join(monorepoRoot, 'package.json'))) {
      return fromMonorepo;
    }
    return join(process.cwd(), '.local-uploads');
  }

  private readCloudinaryConfig(): { cloudName: string; apiKey: string; apiSecret: string } | null {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) return null;
    if (PLACEHOLDER_VALUES.has(cloudName) || PLACEHOLDER_VALUES.has(apiKey) || PLACEHOLDER_VALUES.has(apiSecret)) {
      return null;
    }
    return { cloudName, apiKey, apiSecret };
  }

  private cloudinarySignedUpload(
    folder: string | undefined,
    cloudinary: { cloudName: string; apiKey: string; apiSecret: string },
  ): Omit<UploadConfigResponse, 'provider'> {
    const { cloudName, apiKey, apiSecret } = cloudinary;
    const timestamp = Math.floor(Date.now() / 1000);
    const safeFolder = (folder ?? 'rentingi/cars').trim() || 'rentingi/cars';
    const allowedFormats = 'jpg,jpeg,png,webp,heic,heif';

    const signaturePayload = `allowed_formats=${allowedFormats}&folder=${safeFolder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signaturePayload).digest('hex');

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      fields: {
        api_key: apiKey,
        timestamp,
        folder: safeFolder,
        allowed_formats: allowedFormats,
        signature,
      },
    };
  }

  private apiPublicBaseUrl(): string {
    return (process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
  }
}
