// src/main.js
import { WebGLModule } from './reto.js';

const canvasWidth = 800;
const canvasHeight = 600;
const webGLModule = new WebGLModule(canvasWidth, canvasHeight);

function updateVisualization() {
  fetch('http://localhost:8521/get_agents')  // Ensure this matches your server's address
    .then(response => response.json())
    .then(data => {
      webGLModule.update(data);
    })
    .catch(error => console.error('Error fetching agent data:', error));
}

// Update visualization periodically
setInterval(updateVisualization, 1000);
