import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PhotoData } from './models/photo-data.model';
import { ImageProcessorService } from './services/image-processor.service';
import { MapComponent } from './components/map/map.component';
import heic2any from 'heic2any';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MapComponent],
})
export class AppComponent {
  private sanitizer = inject(DomSanitizer);
  private imageProcessor = inject(ImageProcessorService);

  photos = signal<PhotoData[]>([]);
  activePhotoId = signal<string | null>(null);

  activePhoto = computed(() => {
    const id = this.activePhotoId();
    if (!id) return null;
    return this.photos().find(p => p.id === id) ?? null;
  });

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    for (const file of Array.from(input.files)) {
      const id = `${file.name}-${new Date().getTime()}`;
      
      let thumbnailUrl = '';
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$|\.heif$/i.test(file.name);
      let fileForProcessing: File | Blob = file;

      if (isHeic) {
        try {
          const conversionResult = await heic2any({ blob: file, toType: 'image/jpeg' });
          const convertedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
          fileForProcessing = convertedBlob as Blob;
          thumbnailUrl = URL.createObjectURL(fileForProcessing);
        } catch (e) {
          console.error('HEIC conversion failed', e);
          // Handle error gracefully
          continue;
        }
      } else {
        thumbnailUrl = URL.createObjectURL(file);
      }

      const preliminaryPhoto: PhotoData = {
        id,
        file: file,
        displayBlob: fileForProcessing,
        thumbnailUrl,
        safeThumbnailUrl: this.sanitizer.bypassSecurityTrustUrl(thumbnailUrl),
        state: 'loading',
        gps: null,
        exif: null,
        error: null,
      };
      this.photos.update(p => [...p, preliminaryPhoto]);
      this.setActivePhoto(id);

      const processedData = await this.imageProcessor.processImage(file);

      this.photos.update(currentPhotos => 
        currentPhotos.map(p => p.id === id ? { ...p, ...processedData } : p)
      );
    }
    input.value = '';
  }

  setActivePhoto(photoId: string | null): void {
    this.activePhotoId.set(photoId);
  }

  deletePhoto(photoId: string): void {
    const currentPhotos = this.photos();
    const photoIndex = currentPhotos.findIndex(p => p.id === photoId);

    if (photoIndex === -1) {
        return; // Photo not found
    }

    // Revoke object URL to prevent memory leaks
    const photoToDelete = currentPhotos[photoIndex];
    URL.revokeObjectURL(photoToDelete.thumbnailUrl);

    const newPhotos = currentPhotos.filter(p => p.id !== photoId);
    this.photos.set(newPhotos);

    // If the deleted photo was the active one, select a new one
    if (this.activePhotoId() === photoId) {
        if (newPhotos.length === 0) {
            this.activePhotoId.set(null);
        } else {
            // Select the next photo, or the previous one if the last was deleted
            const newIndex = Math.min(photoIndex, newPhotos.length - 1);
            this.activePhotoId.set(newPhotos[newIndex].id);
        }
    }
  }
}