import { SafeUrl } from '@angular/platform-browser';

export interface PhotoData {
  id: string;
  file: File;
  displayBlob: Blob; // The blob used for display (could be original or converted JPEG)
  thumbnailUrl: string;
  safeThumbnailUrl: SafeUrl;
  state: 'loading' | 'processed' | 'error';
  gps: {
    lat: number;
    lng: number;
  } | null;
  exif: {
    make?: string;
    model?: string;
    dateTaken?: Date;
  } | null;
  error: string | null;
}
