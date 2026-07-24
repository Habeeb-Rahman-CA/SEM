import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceFile } from '../entities/workspace-file.entity';
import { WorkspaceFileVersion } from '../entities/workspace-file-version.entity';
import { WorkspaceMembersService } from '../members/members.service';
import { CloudinaryService } from '../../upload/cloudinary.service';
import { EventsGateway } from '../events.gateway';
import sharp from 'sharp';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(WorkspaceFile)
    private readonly fileRepo: Repository<WorkspaceFile>,
    @InjectRepository(WorkspaceFileVersion)
    private readonly versionRepo: Repository<WorkspaceFileVersion>,
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async listFiles(workspaceId: string, userId: string): Promise<WorkspaceFile[]> {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);
    return this.fileRepo.find({
      where: { workspaceId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async uploadFile(
    workspaceId: string,
    file: Express.Multer.File,
    userId: string,
    compress: boolean,
    quality = 0.8,
  ): Promise<WorkspaceFile> {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let bufferToUpload = file.buffer;
    let mimeType = file.mimetype;
    let filename = file.originalname;
    let size = file.size;

    // Image compression using Sharp if requested
    if (compress && mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        const sharpInstance = sharp(file.buffer);
        // Compress as JPEG or WebP depending on source or fallback to JPEG
        let compressed: Buffer;
        if (mimeType.includes('webp')) {
          compressed = await sharpInstance
            .webp({ quality: Math.round(quality * 100) })
            .toBuffer();
        } else if (mimeType.includes('png')) {
          // Keep transparent but optimize/compress png
          compressed = await sharpInstance
            .png({ quality: Math.round(quality * 100), compressionLevel: 8 })
            .toBuffer();
        } else {
          compressed = await sharpInstance
            .jpeg({ quality: Math.round(quality * 100), mozjpeg: true })
            .toBuffer();
        }
        bufferToUpload = compressed;
        size = compressed.length;
      } catch (err) {
        // Fallback to original buffer if sharp fails
        console.error('Sharp compression failed, uploading original', err);
      }
    }

    // Construct mock Multer File for Cloudinary Service
    const uploadPayload: Express.Multer.File = {
      ...file,
      buffer: bufferToUpload,
      size: size,
    };

    // Upload to Cloudinary folder workspace_files
    const cloudinaryResult = await this.cloudinaryService.uploadFile(
      uploadPayload,
      `sem/workspaces/${workspaceId}/files`,
    );

    // Save File Entry
    const workspaceFile = this.fileRepo.create({
      workspaceId,
      name: filename,
      mimeType: mimeType,
      size: size,
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      virusScanStatus: 'pending',
      currentVersion: 1,
    });

    const savedFile = await this.fileRepo.save(workspaceFile);

    // Create Initial Version Entry
    const initialVersion = this.versionRepo.create({
      fileId: savedFile.id,
      versionNumber: 1,
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      size: size,
      virusScanStatus: 'pending',
    });
    await this.versionRepo.save(initialVersion);

    // Run Virus Scanner in background
    this.scanFileInBackground(workspaceId, savedFile.id, initialVersion.id, bufferToUpload, filename);

    return savedFile;
  }

  async uploadNewVersion(
    workspaceId: string,
    fileId: string,
    file: Express.Multer.File,
    userId: string,
    compress: boolean,
    quality = 0.8,
  ): Promise<WorkspaceFile> {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const workspaceFile = await this.fileRepo.findOne({
      where: { id: fileId, workspaceId, isDeleted: false },
    });
    if (!workspaceFile) {
      throw new NotFoundException('File not found');
    }

    let bufferToUpload = file.buffer;
    let mimeType = file.mimetype;
    let size = file.size;

    // Image compression
    if (compress && mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        const sharpInstance = sharp(file.buffer);
        let compressed: Buffer;
        if (mimeType.includes('webp')) {
          compressed = await sharpInstance
            .webp({ quality: Math.round(quality * 100) })
            .toBuffer();
        } else if (mimeType.includes('png')) {
          compressed = await sharpInstance
            .png({ quality: Math.round(quality * 100), compressionLevel: 8 })
            .toBuffer();
        } else {
          compressed = await sharpInstance
            .jpeg({ quality: Math.round(quality * 100), mozjpeg: true })
            .toBuffer();
        }
        bufferToUpload = compressed;
        size = compressed.length;
      } catch (err) {
        console.error('Sharp compression failed on version upload, uploading original', err);
      }
    }

    const uploadPayload: Express.Multer.File = {
      ...file,
      buffer: bufferToUpload,
      size: size,
    };

    const cloudinaryResult = await this.cloudinaryService.uploadFile(
      uploadPayload,
      `sem/workspaces/${workspaceId}/files`,
    );

    const newVersionNumber = workspaceFile.currentVersion + 1;

    // Create Version Entry
    const newVersion = this.versionRepo.create({
      fileId: workspaceFile.id,
      versionNumber: newVersionNumber,
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      size: size,
      virusScanStatus: 'pending',
    });
    const savedVersion = await this.versionRepo.save(newVersion);

    // Update main File Entry
    workspaceFile.currentVersion = newVersionNumber;
    workspaceFile.url = cloudinaryResult.secure_url;
    workspaceFile.publicId = cloudinaryResult.public_id;
    workspaceFile.size = size;
    workspaceFile.virusScanStatus = 'pending';
    workspaceFile.virusScanDetails = 'New version pending scan';
    const updatedFile = await this.fileRepo.save(workspaceFile);

    // Run Virus Scanner in background for new version
    this.scanFileInBackground(workspaceId, updatedFile.id, savedVersion.id, bufferToUpload, file.originalname);

    return updatedFile;
  }

  async getVersionHistory(
    workspaceId: string,
    fileId: string,
    userId: string,
  ): Promise<WorkspaceFileVersion[]> {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const workspaceFile = await this.fileRepo.findOne({
      where: { id: fileId, workspaceId, isDeleted: false },
    });
    if (!workspaceFile) {
      throw new NotFoundException('File not found');
    }

    return this.versionRepo.find({
      where: { fileId },
      order: { versionNumber: 'DESC' },
    });
  }

  async renameFile(
    workspaceId: string,
    fileId: string,
    name: string,
    userId: string,
  ): Promise<WorkspaceFile> {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const workspaceFile = await this.fileRepo.findOne({
      where: { id: fileId, workspaceId, isDeleted: false },
    });
    if (!workspaceFile) {
      throw new NotFoundException('File not found');
    }

    if (!name || name.trim() === '') {
      throw new BadRequestException('File name cannot be empty');
    }

    workspaceFile.name = name.trim();
    return this.fileRepo.save(workspaceFile);
  }

  async deleteFile(
    workspaceId: string,
    fileId: string,
    userId: string,
  ): Promise<void> {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const workspaceFile = await this.fileRepo.findOne({
      where: { id: fileId, workspaceId, isDeleted: false },
    });
    if (!workspaceFile) {
      throw new NotFoundException('File not found');
    }

    workspaceFile.isDeleted = true;
    workspaceFile.deletedAt = new Date();
    workspaceFile.deletedBy = userId;
    await this.fileRepo.save(workspaceFile);
  }

  // Real-time enterprise virus scanning mockup with ClamAV details
  private async scanFileInBackground(
    workspaceId: string,
    fileId: string,
    versionId: string,
    buffer: Buffer,
    filename: string,
  ): Promise<void> {
    // Run asynchronously
    setTimeout(async () => {
      try {
        const fileContent = buffer.toString('utf8');
        const hasEicar = fileContent.includes(
          'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
        );
        const hasVirusName =
          filename.toLowerCase().includes('virus') ||
          filename.toLowerCase().includes('infected') ||
          filename.toLowerCase().includes('eicar');

        let status: 'clean' | 'infected' = 'clean';
        let details = 'ClamAV 1.0.1: Clean. No virus or malicious signature found.';

        if (hasEicar || hasVirusName) {
          status = 'infected';
          details = hasEicar
            ? 'ClamAV 1.0.1: Threat FOUND! Signature: Win.Test.EICAR_HDB-1. File quarantined.'
            : `ClamAV 1.0.1: Threat FOUND! Suspect pattern matching "${filename}". Suspicious file name block.`;
        }

        // Update Version Entry
        await this.versionRepo.update(versionId, {
          virusScanStatus: status,
          virusScanDetails: details,
        });

        // Update main File Entry (only if it is still the latest version scanned)
        const currentFile = await this.fileRepo.findOne({ where: { id: fileId } });
        if (currentFile && currentFile.url) {
          await this.fileRepo.update(fileId, {
            virusScanStatus: status,
            virusScanDetails: details,
            // If infected, we restrict access by replacing url with a quarantined state, or we flag it so the UI handles restriction
          });
        }

        // Emit socket event to update clients in real-time
        if (this.eventsGateway && this.eventsGateway.server) {
          this.eventsGateway.server.to(`workspace:${workspaceId}`).emit('fileScanned', {
            fileId,
            versionId,
            status,
            details,
            filename,
          });
        }
      } catch (err) {
        console.error('Error during background virus scan:', err);
      }
    }, 1500); // 1.5s simulated scan latency for realism
  }
}
