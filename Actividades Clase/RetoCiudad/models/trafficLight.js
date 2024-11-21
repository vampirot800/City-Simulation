import { Agent } from './agent.js';

export class TrafficLight extends Agent {
    constructor(id, model, position, state = false, timeToChange = 10) {
        super(id, model, position);
        this.state = state;
        this.timeToChange = timeToChange;
        this.loadModel();
    }

    loadModel() {
        // Crear geometría del semáforo y añadir luz
        const geometry = new THREE.BoxGeometry(0.2, 1, 0.2);
        const material = new THREE.MeshLambertMaterial({ color: 0x000000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position[0], 0.5, this.position[1]);

        const lightColor = this.state ? 0x00ff00 : 0xff0000;
        this.light = new THREE.PointLight(lightColor, 1, 5);
        this.light.position.set(0, 0.5, 0);
        this.mesh.add(this.light);
    }

    step() {
        if (this.model.steps % this.timeToChange === 0) {
            this.state = !this.state;
            const lightColor = this.state ? 0x00ff00 : 0xff0000;
            this.light.color.setHex(lightColor);
        }
    }
}
