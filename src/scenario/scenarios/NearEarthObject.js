/** 

mass : kg
dist : km
apeed : km/s
radius: km

*/

import Promise from 'bluebird';
import $ from 'jquery';
import { sun, mercury, venus, earth, mars, moon } from './CommonCelestialBodies';

import { J2000, AU } from '../../constants';

const baseNEO = {
	mass: 1,
	radius: 2000,
	color: '#ffffff',
};

const N_TO_SHOW = 10;
const MIN_DIST = 0.05;
const NASA_API = '';

function onLoadError(jqXHR, textStatus, errorThrown) {
	alert('Error loading NEO definitions. See console.');
	console.log(textStatus, errorThrown);
	console.log(jqXHR);
}

function onListLoaded(res) {
	// console.log(res);
	if (res.near_earth_objects) {
		const allLinks = Object.keys(res.near_earth_objects).reduce((neoLinks, day) => {
			const dayNeos = res.near_earth_objects[day];
			return neoLinks.concat(dayNeos.map((neoDef) => {
				const { close_approach_data } = neoDef;
				const missData = close_approach_data && close_approach_data[0];
				const missDist = missData && Number(missData.miss_distance.astronomical);
				if (missDist && missDist < MIN_DIST) {
					return {
						dist: missDist,
						url: neoDef.links && neoDef.links.self,
					};
				}
				return null;
			}).filter(a => a).sort((a, b) => a - b));
		}, []);
		allLinks.length = N_TO_SHOW;
		const allLoaded = allLinks.map(loadNeo);
		return Promise.all(allLoaded).then((allNeo) => {
			return allNeo.reduce((neos, neo) => {
				neos[neo.name] = neo;
				return neos;
			}, {});
		});
	}
	return Promise.reject();
}

function loadNeo(neoData) {
	return $.ajax({
		url: neoData.url,
		dataType: 'json',
		crossDomain: true,
	}).then(onObjectLoaded, onLoadError);
}

function onObjectLoaded(res) {
	const { name, orbital_data } = res;
	// console.log(res);

	const tsSinceJ2000 = (Number(orbital_data.epoch_osculation) - 2451545) * (60 * 60 * 24 * 1000);
	const epochTime = J2000.getTime() + tsSinceJ2000;
	const epoch = new Date(epochTime);
	return Object.assign({
		name,
		title: name,
		orbit: {
			epoch,
			base: {
				a: Number(orbital_data.semi_major_axis) * AU,
				e: Number(orbital_data.eccentricity),
				w: Number(orbital_data.perihelion_argument),
				M: Number(orbital_data.mean_anomaly),
				i: Number(orbital_data.inclination),
				o: Number(orbital_data.ascending_node_longitude),
			},
			day: {
				M: 360 / Number(orbital_data.orbital_period),
			},
		},
	}, baseNEO);
}

let scenarioReady;
const cnf = {
	name: 'NEO',
	title: 'Near Earth Objects',
	load: () => {
		if (scenarioReady) return scenarioReady.promise();
		
		scenarioReady = $.ajax({
			url: 'https://api.nasa.gov/neo/rest/v1/feed',
			data: {
				start_date: (new Date()).toISOString().substring(0, 10),
				api_key: NASA_API,
			},
			dataType: 'json',
			crossDomain: true,
		}).then(onListLoaded, onLoadError).then(neos => {
			console.log(neos);
			cnf.bodies = Object.assign(cnf.bodies, neos);
		});

		return scenarioReady;
	},
	/*calculateAll : true,
	usePhysics : true,/**/
	commonBodies: [
		sun,
		mercury,
		venus,
		earth,
		moon,
		mars,
	],
	secondsPerTick: { min: 60, max: 3600 * 5, initial: 3600 },
	defaultGuiSettings: { 
		planetScale: 1,
	},
	help: `This scenario shows the next ${N_TO_SHOW} passages closer than ${MIN_DIST} AU of near Earth objects from Nasa's Near Earth Object Project (<a href="http://neo.jpl.nasa.gov/" target="_blank">http://neo.jpl.nasa.gov/</a>.`,
};

export default cnf;