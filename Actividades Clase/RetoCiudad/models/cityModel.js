import { Agent } from './agent.js';
import { Car } from './car.js';
import { TrafficLight } from './trafficLight.js';
import { Road } from './road.js';
import { Obstacle } from './obstacle.js';
import { Destination } from './destination.js';
import { MultiGrid } from './multiGrid.js';

export class CityModel {
    constructor(N, scene) {
        this.numAgents = N;
        this.scene = scene;
        this.schedule = [];
        this.grid = null;
        this.trafficLights = [];
        this.steps = 0;
        this.running = true;
        this.width = 0;
        this.height = 0;

        this.loadMap();
    }

    async loadMap() {
        // Cargar mapa y diccionario
        const mapResponse = await fetch('data/map.txt');
        const mapText = await mapResponse.text();
        const mapLines = mapText.trim().split('\n');
        this.height = mapLines.length;
        this.width = mapLines[0].length;

        const dictResponse = await fetch('data/map_dictionary.json');
        const symbolDict = await dictResponse.json();

        // Inicializar el grid
        this.grid = new MultiGrid(this.width, this.height);

        // Procesar el mapa y crear agentes
        for (let r = 0; r < this.height; r++) {
            const row = mapLines[r];
            for (let c = 0; c < this.width; c++) {
                const col = row[c];
                const symbol = symbolDict[col];
                const position = [c, this.height - r - 1];

                let agent;

                if (['Left', 'Right', 'Up', 'Down'].includes(symbol)) {
                    agent = new Road(`r_${r * this.width + c}`, this, position, symbol);
                } else if (col === 'S' || col === 's') {
                    const state = col === 'S' ? false : true;
                    const timeToChange = parseInt(symbol);
                    agent = new TrafficLight(`tl_${r * this.width + c}`, this, position, state, timeToChange);
                    this.schedule.push(agent);
                    this.trafficLights.push(agent);
                } else if (symbol === 'Obstacle') {
                    agent = new Obstacle(`ob_${r * this.width + c}`, this, position);
                } else if (symbol === 'Destination') {
                    agent = new Destination(`d_${r * this.width + c}`, this, position);
                }

                if (agent) {
                    this.grid.placeAgent(agent, position);
                    agent.addToScene(this.scene);
                }
            }
        }

        // Agregar vehículos iniciales
        for (let i = 0; i < this.numAgents; i++) {
            const car = new Car(`car_${i}`, this, /* posición inicial */);
            this.schedule.push(car);
            this.grid.placeAgent(car, /* posición inicial */);
            car.addToScene(this.scene);
        }
    }

    step() {
        this.steps++;
        for (let agent of this.schedule) {
            agent.step();
        }
    }
}
