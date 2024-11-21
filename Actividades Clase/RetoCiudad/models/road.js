import { Agent } from './agent.js';

export class Road extends Agent {
    constructor(id, model, position, direction) {
        super(id, model, position);
        this.direction = direction;
        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const texture = new THREE.TextureLoader().load('assets/textures/road_texture.jpg');
        const material = new THREE.MeshLambertMaterial({ map: texture });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(this.position[0], 0, this.position[1]);
    }

    step() {
        // Las carreteras pueden no requerir acción en cada paso
    }
}
