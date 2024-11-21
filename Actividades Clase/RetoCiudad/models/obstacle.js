import { Agent } from './agent.js';

export class Obstacle extends Agent {
    constructor(id, model, position) {
        super(id, model, position);
        this.loadModel();
    }

    loadModel() {
        const loader = new THREE.GLTFLoader();
        loader.load('assets/models/building.glb', (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.position.set(this.position[0], 0, this.position[1]);
        });
    }

    step() {
        // Los obstáculos no requieren acción en cada paso
    }
}
