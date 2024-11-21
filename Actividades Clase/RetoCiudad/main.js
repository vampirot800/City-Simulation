//
// Reto Movilidad Urbana
// Ramiro Flores 
// Julia Duenkelsbuehler
// TC2008B
//


import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityModel } from './models/cityModel.js';

let scene, camera, renderer, controls, model;

async function init() {
    // Crear la escena
    scene = new THREE.Scene();

    // Configurar la cámara
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);

    // Configurar el renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Añadir controles orbitales
    controls = new OrbitControls(camera, renderer.domElement);

    // Añadir luces
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Inicializar el modelo
    model = new CityModel(5, scene);

    // Iniciar la animación
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    // Avanzar el modelo un paso
    model.step();

    // Renderizar la escena
    renderer.render(scene, camera);
}

init();
