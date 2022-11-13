import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl'; // or "const mapboxgl = require('mapbox-gl');"
import * as turf from '@turf/turf';

// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com
mapboxgl.accessToken = process.env.MAPBOX_KEY;
const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/mapbox/dark-v10', // style URL
  center: [-96.7970, 32.7767], // starting position [lng, lat]
  zoom: 7, // starting zoom
  projection: 'globe' // display the map as a 3D globe
});
let markers = [];

function fetch_sightings(elem, coordinates) {
  // Fetch all sightings near selected coordinates
  let sightings = [
    {"color": "yellow", "geometry": {"coordinates": [coordinates[0] - Math.random() * .5, coordinates[1] + Math.random() * .5]}},
    {"color": elem.car_color, "geometry": {"coordinates": [coordinates[0] + Math.random() * .5, coordinates[1] + Math.random() * .5]}},
    {"color": "red", "geometry": {"coordinates": [coordinates[0] - Math.random() * .5, coordinates[1] + Math.random() * .5]}},
    {"color": elem.car_color, "geometry": {"coordinates": [coordinates[0] + Math.random() * .5, coordinates[1] + Math.random() * .5]}},
    {"color": elem.car_color, "geometry": {"coordinates": [coordinates[0] - Math.random() *.5, coordinates[1] + Math.random() * .5]}},
  ];
  for (let i = 0; i < markers.length; i++) markers[i].remove();
  markers = [];
  sightings.forEach(sighting => {
    if (sighting != null) {
      let coordinates = sighting.geometry.coordinates;
      markers.push(new mapboxgl.Marker({color: sighting.color === elem.car_color ? '#000' : '#00000008'})
        .setLngLat(coordinates)
        .addTo(map));
    }
  });
  // Show expanded details about alert
  document.querySelector('#alerts').setAttribute('style', 'display: none');
  document.querySelector('#expanded').setAttribute('style', 'display: block');
  document.querySelector<HTMLHeadingElement>('#expanded h1').innerText = elem.person_name;
  let $expanded = document.querySelector('#expanded');
  ['age', 'gender', 'race', 'car_color', 'car_make', 'car_model', 'car_year', 'car_plate', 'location'].forEach(attr => {
    if (elem[attr]) {
      $expanded.querySelector('.' + attr).setAttribute('style', 'display: block');
      $expanded.querySelector<HTMLSpanElement>(`.${attr} span`).innerText = elem[attr];
    }
  });
  // Zoom into coordinate
  map.flyTo({
    center: coordinates,
    zoom: 9,
    pitch: 0,
    bearing: 0,
  });
}

map.on('style.load', async () => {
  map.setFog({}); // Set the default atmosphere style

  let response = await fetch('http://localhost:8000/alerts');
  let alerts = await response.json();
  alerts.forEach(elem => {
    if (elem != null) {
      // Add alert to side panel
      const $alerts = document.querySelector('#alerts');
      const $template = document.querySelector('#alert');
      // Clone the template
      // @ts-ignore
      const clone = $template.content.cloneNode(true);
      // Fill in the fields based on what data we have
      clone.querySelector('li').dataset.long = elem.geometry.coordinates[0];
      clone.querySelector('li').dataset.lat = elem.geometry.coordinates[1];
      clone.querySelector('h1').innerText = elem.person_name;
      ['age', 'gender', 'race', 'car_color', 'car_plate'].forEach(attr => {
        if (elem[attr]) {
          clone.querySelector('.' + attr).style = 'display: inline-block';
          clone.querySelector(`.${attr} span`).innerText = elem[attr];
        }
      });
      // Click event listener
      clone.querySelector('li').onclick = () => {fetch_sightings(elem, coordinates)}
      $alerts.appendChild(clone);

      // add circle
      let coordinates = elem.geometry.coordinates;
      const location = turf.point(coordinates);
      let circleData = turf.circle(
        location,
        50,
        { units: 'miles' },
      );

      map.addSource((coordinates[0] + coordinates[1]).toString(), {
        'type': 'geojson',
        'data': circleData,
      });

      map.addLayer({
        id: (coordinates[0] + coordinates[1]).toString(),
        type: 'fill',
        source: (coordinates[0] + coordinates[1]).toString(),
        layout: {},
        paint: {
          'fill-color': elem.car_color,
          'fill-opacity': 0.2
        }
      });
    }
  });
});

function close_alert() {
  document.querySelector('#expanded').setAttribute('style', 'display: none');
  document.querySelector('#alerts').setAttribute('style', 'display: block');
  for (let i = 0; i < markers.length; i++) markers[i].remove();
  markers = [];
}

document.querySelector('#back').addEventListener('click', close_alert);
document.onkeyup = e => { if (e.key === 'Escape') close_alert() };
document.querySelector('#left').addEventListener('click', e => {
  if (e.target === document.querySelector('#left')) close_alert();
});

let $dialog = document.querySelector('dialog');
let $overlay = document.querySelector('.overlay');

document.querySelector('header h1').addEventListener('click', () => {
  $dialog.showModal();
  $overlay.setAttribute('style', 'display: block');
});

$dialog.addEventListener('click', () => {
  $dialog.close();
  $overlay.setAttribute('style', 'display: none');
});
