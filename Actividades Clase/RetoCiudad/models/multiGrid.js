export class MultiGrid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = [];

        for (let x = 0; x < width; x++) {
            this.cells[x] = [];
            for (let y = 0; y < height; y++) {
                this.cells[x][y] = [];
            }
        }
    }

    placeAgent(agent, position) {
        const x = position[0];
        const y = position[1];
        this.cells[x][y].push(agent);
        agent.position = [x, y];
    }

    moveAgent(agent, newPosition) {
        const oldX = agent.position[0];
        const oldY = agent.position[1];
        const newX = newPosition[0];
        const newY = newPosition[1];

        // Remover agente de la celda antigua
        const index = this.cells[oldX][oldY].indexOf(agent);
        if (index > -1) {
            this.cells[oldX][oldY].splice(index, 1);
        }

        // Añadir agente a la nueva celda
        this.cells[newX][newY].push(agent);
        agent.position = [newX, newY];
    }

    getCellContents(position) {
        const x = position[0];
        const y = position[1];
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.cells[x][y];
        } else {
            return [];
        }
    }

    // Otros métodos según sea necesario
}
