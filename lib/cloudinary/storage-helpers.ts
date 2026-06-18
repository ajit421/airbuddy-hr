import cloudinary from '@/lib/cloudinary/client'
import { UploadApiResponse } from 'cloudinary'

type ResourceType = 'image' | 'raw' | 'auto'

/**
 * Upload a Buffer to Cloudinary.
 * Returns the secure URL and the public_id (used for future operations).
 */
export async function uploadBuffer(
  buffer: Buffer,
  publicId: string,
  folder: string,
  resourceType: ResourceType = 'auto'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder,
        resource_type: resourceType,
        // Use signed private delivery (requires signed URLs to access)
        type: 'authenticated',
        overwrite: true,
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'))
        resolve({ url: result.secure_url, publicId: result.public_id })
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * Generate a signed download URL valid for the given number of seconds (default 1 hour).
 * Use this when the file was uploaded with type: 'authenticated'.
 */
export function getSignedUrl(publicId: string, expiresInSeconds = 3600): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  return cloudinary.utils.private_download_url(publicId, '', {
    expires_at: expiresAt,
    resource_type: 'auto',
  })
}

/**
 * Delete a file from Cloudinary by its public_id.
 */
export async function deleteFile(
  publicId: string,
  resourceType: ResourceType = 'auto'
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: 'authenticated',
  })
}

/**
 * Download a file from a Cloudinary URL and return its Buffer.
 * Used by the OCR API to read uploaded Aadhaar/PAN images.
 */
export async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download file: ${res.status} ${res.statusText}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
