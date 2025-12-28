import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PhotoData } from './models/photo-data.model';
import { ImageProcessorService } from './services/image-processor.service';
import { MapComponent } from './components/map/map.component';

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
      const thumbnailUrl = URL.createObjectURL(file);

      // Add a placeholder immediately
      const preliminaryPhoto: PhotoData = {
        id,
        file,
        thumbnailUrl,
        safeThumbnailUrl: this.sanitizer.bypassSecurityTrustUrl(thumbnailUrl),
        state: 'loading',
        gps: null,
        exif: null,
        error: null,
      };
      this.photos.update(p => [...p, preliminaryPhoto]);
      this.setActivePhoto(id);

      // Process the image in the background
      const processedData = await this.imageProcessor.processImage(file);

      // Update the photo with the processed data
      this.photos.update(currentPhotos => 
        currentPhotos.map(p => p.id === id ? { ...p, ...processedData } : p)
      );
    }
    // Reset file input to allow re-uploading the same file
    input.value = '';
  }

  setActivePhoto(photoId: string | null): void {
    this.activePhotoId.set(photoId);
  }
}