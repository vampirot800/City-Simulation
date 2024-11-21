// TAREA CG2
// Autor: [Tu Nombre Aquí]
// Fecha: [Fecha Actual]

'use strict';

// Importar módulos necesarios
import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { v3, m4 } from './libs/starter_3D_lib.js';
import vsGLSL from './assets/shaders/vs_color.glsl?raw';
import fsGLSL from './assets/shaders/fs_color.glsl?raw';

// Variables globales
let gl;
let programInfo;

// Objetos de la escena y sus transformaciones controlables
const scene = {
  pivot: {
    transforms: {
      translation: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      rotationRadians: { x: 0, y: 0, z: 0 },
    },
    bufferInfo: null,
    vao: null,
  },
  wheel: {
    transforms: {
      translation: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      rotationRadians: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    bufferInfo: null,
    vao: null,
  },
};

// Función principal de inicio
async function main() {
  // Obtener el lienzo y el contexto WebGL
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');

  // Ajustar el tamaño del lienzo
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Configurar la interfaz de usuario
  setupGUI();

  // Crear el programa de shaders
  programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  // Cargar y procesar el modelo OBJ de la rueda
  const response = await fetch('./A01710879.obj'); // Asegúrate de que el archivo existe y la ruta es correcta
  const objText = await response.text();
  const wheelArrays = parseOBJ(objText);

  // Crear los buffers y VAO para la rueda
  scene.wheel.bufferInfo = twgl.createBufferInfoFromArrays(gl, wheelArrays);
  scene.wheel.vao = twgl.createVAOFromBufferInfo(gl, programInfo, scene.wheel.bufferInfo);

  // Generar los datos del cubo pivote
  const cubeArrays = createCubeData();
  scene.pivot.bufferInfo = twgl.createBufferInfoFromArrays(gl, cubeArrays);
  scene.pivot.vao = twgl.createVAOFromBufferInfo(gl, programInfo, scene.pivot.bufferInfo);

  // Iniciar el ciclo de renderizado
  requestAnimationFrame(render);
}

// Función para renderizar la escena
function render() {
  // Limpiar el lienzo y configurar WebGL
  gl.clearColor(0.2, 0.2, 0.2, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  // Usar el programa de shaders
  gl.useProgram(programInfo.program);

  // Configurar la matriz de vista y proyección
  const viewProjectionMatrix = getViewProjectionMatrix();

  // Dibujar el cubo pivote
  {
    const pivotMatrix = computeModelMatrix(scene.pivot.transforms);
    const mvpMatrix = m4.multiply(viewProjectionMatrix, pivotMatrix);
    twgl.setUniforms(programInfo, { u_transforms: mvpMatrix });
    gl.bindVertexArray(scene.pivot.vao);
    twgl.drawBufferInfo(gl, scene.pivot.bufferInfo);
  }

  // Dibujar la rueda
  {
    // Calcular las transformaciones combinadas
    const pivotMatrix = computeModelMatrix(scene.pivot.transforms);
    const wheelMatrix = computeModelMatrix(scene.wheel.transforms);
    const modelMatrix = m4.multiply(pivotMatrix, wheelMatrix);
    const mvpMatrix = m4.multiply(viewProjectionMatrix, modelMatrix);

    twgl.setUniforms(programInfo, { u_transforms: mvpMatrix });
    gl.bindVertexArray(scene.wheel.vao);
    twgl.drawBufferInfo(gl, scene.wheel.bufferInfo);
  }

  // Solicitar el siguiente frame
  requestAnimationFrame(render);
}

// Función para configurar la interfaz gráfica de usuario
function setupGUI() {
  const gui = new GUI();

  // Controles para el pivote
  const pivotFolder = gui.addFolder('Pivote');
  pivotFolder.add(scene.pivot.transforms.translation, 'x', -5, 5);
  pivotFolder.add(scene.pivot.transforms.translation, 'y', -5, 5);
  pivotFolder.add(scene.pivot.transforms.translation, 'z', -5, 5);
  pivotFolder
    .add(scene.pivot.transforms.rotationDegrees, 'x', 0, 360)
    .onChange((value) => {
      scene.pivot.transforms.rotationRadians.x = (value * Math.PI) / 180;
    });
  pivotFolder
    .add(scene.pivot.transforms.rotationDegrees, 'y', 0, 360)
    .onChange((value) => {
      scene.pivot.transforms.rotationRadians.y = (value * Math.PI) / 180;
    });
  pivotFolder
    .add(scene.pivot.transforms.rotationDegrees, 'z', 0, 360)
    .onChange((value) => {
      scene.pivot.transforms.rotationRadians.z = (value * Math.PI) / 180;
    });

  // Controles para la rueda
  const wheelFolder = gui.addFolder('Rueda');
  wheelFolder.add(scene.wheel.transforms.translation, 'x', -5, 5);
  wheelFolder.add(scene.wheel.transforms.translation, 'y', -5, 5);
  wheelFolder.add(scene.wheel.transforms.translation, 'z', -5, 5);
  wheelFolder
    .add(scene.wheel.transforms.rotationDegrees, 'x', 0, 360)
    .onChange((value) => {
      scene.wheel.transforms.rotationRadians.x = (value * Math.PI) / 180;
    });
  wheelFolder
    .add(scene.wheel.transforms.rotationDegrees, 'y', 0, 360)
    .onChange((value) => {
      scene.wheel.transforms.rotationRadians.y = (value * Math.PI) / 180;
    });
  wheelFolder
    .add(scene.wheel.transforms.rotationDegrees, 'z', 0, 360)
    .onChange((value) => {
      scene.wheel.transforms.rotationRadians.z = (value * Math.PI) / 180;
    });
  wheelFolder.add(scene.wheel.transforms.scale, 'x', 0.1, 5);
  wheelFolder.add(scene.wheel.transforms.scale, 'y', 0.1, 5);
  wheelFolder.add(scene.wheel.transforms.scale, 'z', 0.1, 5);
}

// Función para obtener la matriz de vista y proyección
function getViewProjectionMatrix() {
  const fieldOfViewRadians = degToRad(60);
  const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projection = m4.perspective(fieldOfViewRadians, aspectRatio, 0.1, 100);

  const cameraPosition = [0, 0, 10];
  const targetPosition = [0, 0, 0];
  const upVector = [0, 1, 0];

  const cameraMatrix = m4.lookAt(cameraPosition, targetPosition, upVector);
  const viewMatrix = m4.inverse(cameraMatrix);

  return m4.multiply(projection, viewMatrix);
}

// Función para calcular la matriz de modelo
function computeModelMatrix(transforms) {
  let matrix = m4.identity();

  // Aplicar traslación
  matrix = m4.multiply(matrix, m4.translation([transforms.translation.x, transforms.translation.y, transforms.translation.z]));

  // Aplicar rotaciones
  matrix = m4.multiply(matrix, m4.rotationX(transforms.rotationRadians.x));
  matrix = m4.multiply(matrix, m4.rotationY(transforms.rotationRadians.y));
  matrix = m4.multiply(matrix, m4.rotationZ(transforms.rotationRadians.z));

  // Aplicar escalado si existe
  if (transforms.scale) {
    matrix = m4.multiply(matrix, m4.scaling([transforms.scale.x, transforms.scale.y, transforms.scale.z]));
  }

  return matrix;
}

// Función para crear los datos de un cubo
function createCubeData() {
  const vertices = [
    // Frente
    -0.3, -0.3,  0.3,
     0.3, -0.3,  0.3,
     0.3,  0.3,  0.3,
    -0.3,  0.3,  0.3,
    // Atrás
    -0.3, -0.3, -0.3,
    -0.3,  0.3, -0.3,
     0.3,  0.3, -0.3,
     0.3, -0.3, -0.3,
    // Arriba
    -0.3,  0.3, -0.3,
    -0.3,  0.3,  0.3,
     0.3,  0.3,  0.3,
     0.3,  0.3, -0.3,
    // Abajo
    -0.3, -0.3, -0.3,
     0.3, -0.3, -0.3,
     0.3, -0.3,  0.3,
    -0.3, -0.3,  0.3,
    // Derecha
     0.3, -0.3, -0.3,
     0.3,  0.3, -0.3,
     0.3,  0.3,  0.3,
     0.3, -0.3,  0.3,
    // Izquierda
    -0.3, -0.3, -0.3,
    -0.3, -0.3,  0.3,
    -0.3,  0.3,  0.3,
    -0.3,  0.3, -0.3,
  ];

  const indices = [
    0,  1,  2,     0,  2,  3,    // Frente
    4,  5,  6,     4,  6,  7,    // Atrás
    8,  9, 10,     8, 10, 11,    // Arriba
   12, 13, 14,    12, 14, 15,    // Abajo
   16, 17, 18,    16, 18, 19,    // Derecha
   20, 21, 22,    20, 22, 23,    // Izquierda
  ];

  const colors = [
    // Frente (rojo)
    1, 0, 0, 1,
    1, 0, 0, 1,
    1, 0, 0, 1,
    1, 0, 0, 1,
    // Atrás (verde)
    0, 1, 0, 1,
    0, 1, 0, 1,
    0, 1, 0, 1,
    0, 1, 0, 1,
    // Arriba (azul)
    0, 0, 1, 1,
    0, 0, 1, 1,
    0, 0, 1, 1,
    0, 0, 1, 1,
    // Abajo (amarillo)
    1, 1, 0, 1,
    1, 1, 0, 1,
    1, 1, 0, 1,
    1, 1, 0, 1,
    // Derecha (magenta)
    1, 0, 1, 1,
    1, 0, 1, 1,
    1, 0, 1, 1,
    1, 0, 1, 1,
    // Izquierda (cian)
    0, 1, 1, 1,
    0, 1, 1, 1,
    0, 1, 1, 1,
    0, 1, 1, 1,
  ];

  return {
    a_position: { numComponents: 3, data: vertices },
    a_color: { numComponents: 4, data: colors },
    indices: indices,
  };
}

// Función para parsear un archivo OBJ simple
function parseOBJ(text) {
  const positions = [];
  const colors = [];
  const indices = [];
  const lines = text.split('\n');
  let vertexCount = 0;

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'v') {
      // Vértice
      positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
      colors.push(0.7, 0.7, 0.7, 1.0); // Color gris por defecto
      vertexCount++;
    } else if (parts[0] === 'f') {
      // Cara
      const faceIndices = parts.slice(1).map((part) => {
        const idx = part.split('/')[0];
        return parseInt(idx, 10) - 1;
      });
      // Triangulación sencilla
      for (let i = 1; i < faceIndices.length - 1; i++) {
        indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
      }
    }
  });

  return {
    a_position: { numComponents: 3, data: positions },
    a_color: { numComponents: 4, data: colors },
    indices: indices,
  };
}

// Función para convertir grados a radianes
function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

// Iniciar el programa
main();
