'use client';

import { Button } from '@/components/ui/button';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';
import { FaDownload } from 'react-icons/fa';

type LatLng = { lat: number; lng: number };

function downloadTextFile(
  filename: string,
  content: string,
  mime = 'application/json',
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function polygonToGeoJSON(coords: LatLng[]) {
  const ring = coords.length
    ? [...coords, coords[0]].map((c) => [c.lng, c.lat])
    : [];

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      },
    ],
  };
}

function polygonToKML(coords: LatLng[]) {
  const closed = coords.length ? [...coords, coords[0]] : [];
  const coordStr = closed.map((c) => `${c.lng},${c.lat},0`).join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Plot</name>
    <Placemark>
      <name>Plot Area</name>
      <Style>
        <LineStyle><width>2</width></LineStyle>
        <PolyStyle><fill>1</fill></PolyStyle>
      </Style>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
}

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(
    null,
  );
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [points, setPoints] = useState<LatLng[]>([]);
  const defaultLocation: LatLng = { lat: -15.7801, lng: -47.9292 };
  const [userLocation, setUserLocation] = useState<LatLng>(defaultLocation);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error.message);
          setUserLocation({ lat: -11.8707624, lng: -55.5475802 });
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  }, []);

  function updatePolygonData(
    poly: google.maps.Polygon,
    setPoints: React.Dispatch<React.SetStateAction<LatLng[]>>,
    setAreaHa: React.Dispatch<React.SetStateAction<number | null>>,
  ) {
    const path = poly.getPath();
    const coords: LatLng[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const p = path.getAt(i);
      coords.push({ lat: p.lat(), lng: p.lng() });
    }
    setPoints(coords);

    if (coords.length >= 3) {
      const areaM2 = google.maps.geometry.spherical.computeArea(path);
      setAreaHa(areaM2 / 10000);
    } else {
      setAreaHa(null);
    }
  }

  useEffect(() => {
    if (!apiKey || !userLocation) return;

    let cancelled = false;

    setOptions({ key: apiKey, libraries: ['drawing', 'geometry'] });

    (async () => {
      const [mapsLib, drawingLib] = await Promise.all([
        importLibrary('maps'),
        importLibrary('drawing'),
        importLibrary('geometry'),
      ]);

      if (cancelled) return;

      const { Map } = mapsLib;
      const { DrawingManager, OverlayType } =
        drawingLib as google.maps.DrawingLibrary;

      const map = new Map(mapDivRef.current!, {
        center: userLocation,
        zoom: 15,
        mapTypeId: 'hybrid',
        streetViewControl: false,
        fullscreenControl: true,
      });
      mapRef.current = map;

      const drawingManager = new DrawingManager({
        drawingMode: OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [OverlayType.POLYGON],
        },
        polygonOptions: {
          editable: true,
          draggable: false,
        },
      });
      drawingManager.setMap(map);
      drawingManagerRef.current = drawingManager;

      google.maps.event.addListener(
        drawingManager,
        'overlaycomplete',
        (e: google.maps.drawing.OverlayCompleteEvent) => {
          if (e.type !== OverlayType.POLYGON) return;

          if (polygonRef.current) polygonRef.current.setMap(null);

          const poly = e.overlay as google.maps.Polygon;
          polygonRef.current = poly;

          drawingManager.setDrawingMode(null);

          const update = () => updatePolygonData(poly, setPoints, setAreaHa);

          update();
          google.maps.event.addListener(poly.getPath(), 'set_at', update);
          google.maps.event.addListener(poly.getPath(), 'insert_at', update);
          google.maps.event.addListener(poly.getPath(), 'remove_at', update);
        },
      );
    })();

    return () => {
      cancelled = true;
      if (polygonRef.current) polygonRef.current.setMap(null);
      if (drawingManagerRef.current) drawingManagerRef.current.setMap(null);
      mapRef.current = null;
    };
  }, [apiKey, userLocation]);

  const handleClear = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    setPoints([]);
    setAreaHa(null);
    drawingManagerRef.current?.setDrawingMode(
      google.maps.drawing.OverlayType.POLYGON,
    );
  };

  const downloadGeoJSON = () => {
    if (points.length < 3) return;
    const geo = polygonToGeoJSON(points);
    downloadTextFile(
      'area.geojson',
      JSON.stringify(geo, null, 2),
      'application/geo+json',
    );
  };

  const downloadKML = () => {
    if (points.length < 3) return;
    const kml = polygonToKML(points);
    downloadTextFile('area.kml', kml, 'application/vnd.google-earth.kml+xml');
  };

  return (
    <div className="relative h-screen w-full">
      <div ref={mapDivRef} className="h-full w-full" />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-sm shadow-lg border border-gray-200">
        <Button
          onClick={downloadKML}
          disabled={points.length < 3}
          variant="default"
          className="cursor-pointer"
        >
          <FaDownload className="mr-1" />
          KML
        </Button>
        <Button
          onClick={downloadGeoJSON}
          disabled={points.length < 3}
          variant="default"
          className="cursor-pointer"
        >
          <FaDownload className="mr-1" />
          GEO
        </Button>
        <Button
          onClick={handleClear}
          variant="destructive"
          className="cursor-pointer"
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}
