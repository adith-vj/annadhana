import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";

const RoutingControl = ({ start, end }) => {
  const map = useMap();

  useEffect(() => {
    if (!start || !end) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start[0], start[1]), // NGO Location
        L.latLng(end[0], end[1])      // Food Location
      ],
      routeWhileDragging: false,
      show: false,             // Hide the text instructions (Turn left, etc.)
      addWaypoints: false,     // Disable adding extra stops
      draggableWaypoints: false,
      fitSelectedRoutes: true, // Zoom to fit the path
      lineOptions: {
        styles: [{ color: "#6FA1EC", weight: 5 }] // Blue line style
      },
      // This function prevents the plugin from adding its own default markers
      // (Since we already have our beautiful custom pins)
      createMarker: function() { return null; } 
    }).addTo(map);

    return () => map.removeControl(routingControl);
  }, [map, start, end]);

  return null;
};

export default RoutingControl;