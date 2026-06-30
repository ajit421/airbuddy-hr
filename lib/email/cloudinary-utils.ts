// lib/email/cloudinary-utils.ts
// Cloudinary utilities for email attachments

import { uploadBuffer } from '@/lib/cloudinary/storage-helpers';
import { generateFileName } from '@/lib/export/file-naming';
import type { Employee } from '@/types/employee';

export interface UploadedFileInfo {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
}

/**
 * Upload PDF to Cloudinary and return URL for email
 */
export async function uploadPDFToCloudinary(
  pdfBuffer: Buffer,
  employee: Partial<Employee>,
  documentTitle: string,
  documentType: string,
  versionNumber: number = 1
): Promise<UploadedFileInfo | null> {
  try {
    const fileName = generateFileName({
      employeeId: employee.employeeId || employee.id,
      documentTitle,
      documentType,
      versionNumber,
      extension: 'pdf',
    });

    // Upload to Cloudinary
    const result = await uploadBuffer(pdfBuffer, {
      folder: 'airbuddy-hr/emails',
      public_id: `email-${Date.now()}-${fileName.replace('.pdf', '')}`,
      resource_type: 'raw',
      overwrite: false,
    });

    if (!result?.secure_url) {
      console.error('[Cloudinary] Failed to upload PDF for email');
      return null;
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileName,
      fileSize: pdfBuffer.length,
    };
  } catch (error) {
    console.error('[Cloudinary] Error uploading PDF:', error);
    return null;
  }
}

/**
 * Get Cloudinary URL with expiration (for temporary access)
 */
export function getCloudinarySignedUrl(
  publicId: string,
  expiresIn: number = 3600 // 1 hour
): string {
  // Note: This requires Cloudinary API secret
  // In production, you might want to generate this server-side
  // For now, we'll return the public URL
  return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${publicId}`;
}

/**
 * Clean up uploaded files from Cloudinary
 */
export async function cleanupCloudinaryFiles(publicIds: string[]): Promise<void> {
  // Implementation would use Cloudinary admin API
  // This is a placeholder for future implementation
  console.log('[Cloudinary] Would clean up files:', publicIds);
}
