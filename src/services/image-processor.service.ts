import { Injectable } from '@angular/core';
import { PhotoData } from '../models/photo-data.model';
import exifr from 'exifr';

// Define a type for the subset of PhotoData this service returns
type ProcessedPhotoData = Pick<PhotoData, 'gps' | 'exif' | 'error' | 'state'>;

@Injectable({
  providedIn: 'root',
})
export class ImageProcessorService {

  async processImage(file: File): Promise<ProcessedPhotoData> {
    try {
      const data = await exifr.parse(file, true);
      
      if (!data) {
        return {
          state: 'error',
          error: 'Could not parse image metadata.',
          gps: null,
          exif: null,
        };
      }

      const gps = (data.latitude && data.longitude) 
        ? { lat: data.latitude, lng: data.longitude } 
        : null;

      return {
        state: 'processed',
        gps,
        exif: {
          make: data.Make,
          model: data.Model,
          dateTaken: data.DateTimeOriginal,
        },
        error: gps ? null : 'No GPS data found in image.',
      };

    } catch (error) {
      console.error('Error processing image:', error);
      return {
        state: 'error',
        error: 'File type may not be supported.',
        gps: null,
        exif: null,
      };
    }
  }
}
