import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { AffectedCorridor } from '@/types'
import { BENGALURU_CENTER, BENGALURU_ZOOM, SEVERITY_COLORS } from '@/constants'

// Fix Leaflet default icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props {
  affectedCorridors: AffectedCorridor[]
  eventLat?: number
  eventLon?: number
  geoJSON?: GeoJSON.FeatureCollection | null
}

export function MapView({ affectedCorridors, eventLat, eventLon, geoJSON }: Props) {
  const mapRef        = useRef<L.Map | null>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const geoLayerRef   = useRef<L.GeoJSON | null>(null)
  const markerRef     = useRef<L.Marker | null>(null)

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = L.map(containerRef.current, {
      center: BENGALURU_CENTER,
      zoom:   BENGALURU_ZOOM,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(mapRef.current)

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Update GeoJSON corridor overlay whenever prediction changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing layer
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current)
      geoLayerRef.current = null
    }

    if (!geoJSON?.features?.length) return

    geoLayerRef.current = L.geoJSON(geoJSON, {
      style: (feature) => {
        const props = feature?.properties ?? {}
        return {
          color:   props.color   ?? '#9CA3AF',
          weight:  props.weight  ?? 4,
          opacity: props.opacity ?? 0.85,
        }
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties ?? {}
        layer.bindPopup(
          `<div class="text-sm">
            <strong>${p.name ?? 'Corridor'}</strong><br/>
            Severity: <span style="color:${p.color}">${p.severity}</span><br/>
            ${p.estimated_delay_minutes ? `+${p.estimated_delay_minutes} min delay` : ''}
          </div>`,
          { maxWidth: 200 },
        )
      },
    }).addTo(map)

  }, [geoJSON])

  // Update event marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (markerRef.current) {
      map.removeLayer(markerRef.current)
      markerRef.current = null
    }

    if (eventLat && eventLon) {
      markerRef.current = L.marker([eventLat, eventLon])
        .addTo(map)
        .bindPopup('<strong>Event Location</strong>')
      map.flyTo([eventLat, eventLon], 13, { animate: true, duration: 0.8 })
    }
  }, [eventLat, eventLon])

  // Fallback: draw colored polylines for affected corridors when no GeoJSON
  useEffect(() => {
    const map = mapRef.current
    if (!map || geoJSON?.features?.length) return

    // Simple colored legend overlay in absence of GeoJSON
    if (affectedCorridors.length === 0) return

    const info = L.control({ position: 'bottomleft' })
    info.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar bg-white p-2 rounded shadow text-xs')
      div.innerHTML = `
        <strong class="block mb-1">Affected Corridors</strong>
        ${affectedCorridors.map(c => `
          <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
            <span style="width:12px;height:12px;border-radius:50%;background:${SEVERITY_COLORS[c.severity]};display:inline-block"></span>
            <span>${c.name}</span>
          </div>
        `).join('')}
      `
      return div
    }
    info.addTo(map)
    return () => { info.remove() }
  }, [affectedCorridors, geoJSON])

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-inner border border-gray-200">
      <div ref={containerRef} className="w-full h-full" />
      {/* Severity Legend */}
      <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm
                      rounded-lg shadow px-3 py-2 text-xs flex flex-col gap-1">
        {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
          <div key={sev} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-600">{sev}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
