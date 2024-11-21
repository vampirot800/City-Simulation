export class Agent {
    constructor(id, model, position) {
        this.id = id;
        this.model = model;
        this.position = position;
        this.mesh = null;
    }

    addToScene(scene) {
        // Añadir el mesh del agente a la escena
        if (this.mesh) {
            scene.add(this.mesh);
        }
    }

    step() {
        // Método a sobrescribir por subclases
    }
}
