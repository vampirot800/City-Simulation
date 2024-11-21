import { Agent } from './agent.js';

export class Car extends Agent {
    constructor(id, model, position) {
        super(id, model, position);
        this.loadModel();
    }

    loadModel() {
        const loader = new THREE.GLTFLoader();
        loader.load('assets/models/car.glb', (gltf) => {
            this.mesh = gltf.scene;
            this.mesh.position.set(this.position[0], 0, this.position[1]);
        });
    }

    step() {
        // Implementar la lógica de movimiento del vehículo
        // Actualizar posición y mesh
    }
}
