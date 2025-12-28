import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PhotoData } from './models/photo-data.model';
import { ImageProcessorService } from './services/image-processor.service';
import { MapComponent } from './components/map/map.component';
import heic2any from 'heic2any';
import { GeminiService } from './services/gemini.service';

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
  private geminiService = inject(GeminiService);

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
        aiState: 'idle',
        aiLocationName: null,
        isAiLocation: false
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

  async findLocationWithAi(photoId: string): Promise<void> {
    this.photos.update(photos => photos.map(p => 
      p.id === photoId ? { ...p, aiState: 'loading' } : p
    ));

    const photo = this.photos().find(p => p.id === photoId);
    if (!photo) return;
    
    try {
      const base64Image = await this.geminiService.blobToBase64(photo.displayBlob);
      const location = await this.geminiService.getLocationFromImage(base64Image);

      if (location && location.lat && location.lng) {
         this.photos.update(photos => photos.map(p => 
          p.id === photoId 
            ? { ...p, 
                aiState: 'success', 
                gps: { lat: location.lat, lng: location.lng },
                aiLocationName: location.name,
                isAiLocation: true
              } 
            : p
        ));
      } else {
        throw new Error('AI could not determine a valid location.');
      }
    } catch (error) {
      console.error('AI location finding failed:', error);
      this.photos.update(photos => photos.map(p => 
        p.id === photoId ? { ...p, aiState: 'error' } : p
      ));
    }
  }
}