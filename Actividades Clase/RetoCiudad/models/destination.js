import { Agent } from './agent.js';

export class Destination extends Agent {
    constructor(id, model, position) {
        super(id, model, position);
        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.BoxGeometry(1, 0.1, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position[0], 0.05, this.position[1]);
    }

    step() {
        // Los destinos no requieren acción en cada paso
    }
}
