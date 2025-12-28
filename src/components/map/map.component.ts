import { Component, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, OnDestroy, input, output, effect } from '@angular/core';
import { PhotoData } from '../../models/photo-data.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  photos = input.required<PhotoData[]>();
  activePhotoId = input<string | null>(null);
  markerClicked = output<string>();

  private map!: L.Map;
  private markersLayer = L.layerGroup();
  private resizeObserver!: ResizeObserver;
  private markerInstances: { [id: string]: L.Marker } = {};

  private defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  private activeIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  constructor() {
    effect(() => this.updateMarkers(this.photos(), this.activePhotoId()));
    effect(() => this.flyToActiveMarker(this.activePhotoId()));
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.resizeObserver = new ResizeObserver(() => this.map.invalidateSize());
    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [20, 0],
      zoom: 2,
      layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }),
      ],
    });
    this.markersLayer.addTo(this.map);
  }

  private updateMarkers(photos: PhotoData[], activeId: string | null): void {
    if (!this.map) return;

    this.markersLayer.clearLayers();
    this.markerInstances = {};

    photos.forEach(photo => {
      if (photo.gps) {
        const isActive = photo.id === activeId;
        const marker = L.marker([photo.gps.lat, photo.gps.lng], {
          icon: isActive ? this.activeIcon : this.defaultIcon,
        });

        marker.on('click', () => this.markerClicked.emit(photo.id));
        this.markerInstances[photo.id] = marker;
        this.markersLayer.addLayer(marker);
      }
    });
  }

  private flyToActiveMarker(activeId: string | null): void {
    if (!activeId || !this.map) return;
    
    const activePhoto = this.photos().find(p => p.id === activeId);
    if (activePhoto?.gps) {
      this.map.flyTo([activePhoto.gps.lat, activePhoto.gps.lng], 14, {
        animate: true,
        duration: 1.0
      });
    }
  }
}
