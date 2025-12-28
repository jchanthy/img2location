import { SafeUrl } from '@angular/platform-browser';

export interface PhotoData {
  id: string;
  file: File;
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
