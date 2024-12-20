// TAREA CG2
// Ramiro Flores Villarreal
// A01710879
'use strict';

// Importar los módulos necesarios
import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { v3, m4 } from './libs/starter_3D_lib.js';
import vsGLSL from './assets/shaders/vs_color.glsl?raw';
import fsGLSL from './assets/shaders/fs_color.glsl?raw';

// Variables globales
let gl;
let programInfo;

// Variables para los objetos y sus transformaciones controladas por la interfaz de usuario
const objects = {
  pivot: {
    transforms: {
      t: { x: -2, y: 0, z: 0 },  // Traslación inicial hacia la izquierda en el eje X
      rd: { x: 0, y: 0, z: 0 },  // Rotación en grados
      rr: { x: 0, y: 0, z: 0 }   // Rotación en radianes
    },
    bufferInfo: undefined,
    vao: undefined,
  },
  model: {
    transforms: {
      t: { x: 2, y: 0, z: 0 },   // Traslación inicial hacia la derecha en el eje X
      rd: { x: 0, y: 0, z: 0 },  // Rotación en grados
      rr: { x: 0, y: 0, z: 0 },  // Rotación en radianes
      s: { x: 1, y: 1, z: 1 }    // Escala
    },
    bufferInfo: undefined,
    vao: undefined,
  }
};

// Función principal
async function main() {
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');

  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  setupUI();

  // Crear el programa de shaders
  programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  // Cargar el modelo de la rueda desde el archivo OBJ
  const response = await fetch('./A01710879.obj'); 
  const objData = await response.text();

  // Procesar los datos del modelo de la rueda
  const wheelData = loadObj(objData);
  objects.model.bufferInfo = twgl.createBufferInfoFromArrays(gl, wheelData);
  objects.model.vao = twgl.createVAOFromBufferInfo(gl, programInfo, objects.model.bufferInfo);

  // Crear el cubo que representa el pivote
  const cubeData = createCube();
  objects.pivot.bufferInfo = twgl.createBufferInfoFromArrays(gl, cubeData);
  objects.pivot.vao = twgl.createVAOFromBufferInfo(gl, programInfo, objects.pivot.bufferInfo);

  // Iniciar el bucle de dibujo
  requestAnimationFrame(drawScene);
}

// Función para dibujar la escena
function drawScene(time) {
  gl.clearColor(0.2, 0.2, 0.2, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(programInfo.program);

  const viewProjectionMatrix = setupViewProjection(gl);

  // Dibujar el pivote (Cubo) de manera independiente
  {
    const pivotTransforms = computeTransforms(objects.pivot.transforms);
    const pivotMatrix = m4.multiply(viewProjectionMatrix, pivotTransforms);

    twgl.setUniforms(programInfo, { u_transforms: pivotMatrix });
    gl.bindVertexArray(objects.pivot.vao);
    twgl.drawBufferInfo(gl, objects.pivot.bufferInfo);
  }

  // Dibujar la rueda (Modelo) de manera independiente
  {
    const modelTransforms = computeTransforms(objects.model.transforms);
    const modelMatrix = m4.multiply(viewProjectionMatrix, modelTransforms);

    twgl.setUniforms(programInfo, { u_transforms: modelMatrix });
    gl.bindVertexArray(objects.model.vao);
    twgl.drawBufferInfo(gl, objects.model.bufferInfo);
  }

  requestAnimationFrame(drawScene);
}

// Función para configurar la interfaz de usuario
function setupUI() {
  const gui = new GUI();

  // Controles para el pivote
  const pivotFolder = gui.addFolder('Pivote');
  pivotFolder.add(objects.pivot.transforms.t, 'x', -5, 5).name('Traslación X');
  pivotFolder.add(objects.pivot.transforms.t, 'y', -5, 5).name('Traslación Y');
  pivotFolder.add(objects.pivot.transforms.t, 'z', -5, 5).name('Traslación Z');
  pivotFolder.add(objects.pivot.transforms.rd, 'x', 0, 360).name('Rotación X (°)').onChange(value => {
    objects.pivot.transforms.rr.x = value * Math.PI / 180;
  });
  pivotFolder.add(objects.pivot.transforms.rd, 'y', 0, 360).name('Rotación Y (°)').onChange(value => {
    objects.pivot.transforms.rr.y = value * Math.PI / 180;
  });
  pivotFolder.add(objects.pivot.transforms.rd, 'z', 0, 360).name('Rotación Z (°)').onChange(value => {
    objects.pivot.transforms.rr.z = value * Math.PI / 180;
  });

  // Controles para el modelo de la rueda
  const modelFolder = gui.addFolder('Modelo Rueda');

  const translationFolder = modelFolder.addFolder('Traslación');
  translationFolder.add(objects.model.transforms.t, 'x', -5, 5).name('Traslación X');
  translationFolder.add(objects.model.transforms.t, 'y', -5, 5).name('Traslación Y');
  translationFolder.add(objects.model.transforms.t, 'z', -5, 5).name('Traslación Z');

  const rotationFolder = modelFolder.addFolder('Rotación');
  rotationFolder.add(objects.model.transforms.rd, 'x', 0, 360).name('Rotación X (°)').onChange(value => {
    objects.model.transforms.rr.x = value * Math.PI / 180;
  });
  rotationFolder.add(objects.model.transforms.rd, 'y', 0, 360).name('Rotación Y (°)').onChange(value => {
    objects.model.transforms.rr.y = value * Math.PI / 180;
  });
  rotationFolder.add(objects.model.transforms.rd, 'z', 0, 360).name('Rotación Z (°)').onChange(value => {
    objects.model.transforms.rr.z = value * Math.PI / 180;
  });

  const scaleFolder = modelFolder.addFolder('Escala');
  scaleFolder.add(objects.model.transforms.s, 'x', 0.1, 5).name('Escala X');
  scaleFolder.add(objects.model.transforms.s, 'y', 0.1, 5).name('Escala Y');
  scaleFolder.add(objects.model.transforms.s, 'z', 0.1, 5).name('Escala Z');

  modelFolder.open();
}

// Función para configurar la matriz de vista y proyección
function setupViewProjection(gl) {
  const fov = 60 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projectionMatrix = m4.perspective(fov, aspect, 0.1, 100);

  const cameraPosition = [0, 0, 10];
  const target = [0, 0, 0];
  const up = [0, 1, 0];

  const cameraMatrix = m4.lookAt(cameraPosition, target, up);
  const viewMatrix = m4.inverse(cameraMatrix);

  return m4.multiply(projectionMatrix, viewMatrix);
}

// Función para calcular la matriz de transformaciones
function computeTransforms(transforms) {
  let matrix = m4.identity();

  // Traslación
  const translationMatrix = m4.translation([transforms.t.x, transforms.t.y, transforms.t.z]);
  matrix = m4.multiply(matrix, translationMatrix);

  // Rotación en X
  const rotationXMatrix = m4.rotationX(transforms.rr.x);
  matrix = m4.multiply(matrix, rotationXMatrix);

  // Rotación en Y
  const rotationYMatrix = m4.rotationY(transforms.rr.y);
  matrix = m4.multiply(matrix, rotationYMatrix);

  // Rotación en Z
  const rotationZMatrix = m4.rotationZ(transforms.rr.z);
  matrix = m4.multiply(matrix, rotationZMatrix);

  // Escalado (si está disponible)
  if (transforms.s) {
    const scaleMatrix = m4.scale([transforms.s.x, transforms.s.y, transforms.s.z]);
    matrix = m4.multiply(matrix, scaleMatrix);
  }

  return matrix;
}

// Función para cargar el modelo OBJ
function loadObj(objData) {
  const positions = [];
  const normals = [];
  const positionData = [];
  const normalData = [];
  const colorData = [];

  const lines = objData.split('\n');
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const type = parts[0];

    switch (type) {
      case 'v':  // Vértices
        positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        break;
      case 'vn': // Normales
        normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        break;
      case 'f':  // Caras
        const faceVertices = parts.slice(1).map(v => v.split('/').map(n => parseInt(n) - 1));
        for (let i = 1; i < faceVertices.length - 1; i++) {
          const triangle = [faceVertices[0], faceVertices[i], faceVertices[i + 1]];

          triangle.forEach(([vIdx, vtIdx, vnIdx]) => {
            const [vx, vy, vz] = positions[vIdx];
            positionData.push(vx, vy, vz);

            if (vnIdx !== undefined && normals[vnIdx]) {
              const [nx, ny, nz] = normals[vnIdx];
              normalData.push(nx, ny, nz);
            } else {
              normalData.push(0, 0, 1); // Normal por defecto
            }

            colorData.push(0.4, 0.4, 0.4, 1.0); // Color por defecto (gris)
          });
        }
        break;
    }
  });

  return {
    a_position: { numComponents: 3, data: positionData },
    a_color: { numComponents: 4, data: colorData },
    a_normal: { numComponents: 3, data: normalData },
  };
}

// Función para crear un cubo que representa el pivote
function createCube() {
  const positions = [
    // Cara frontal
    -0.3, -0.3,  0.3,
     0.3, -0.3,  0.3,
     0.3,  0.3,  0.3,
    -0.3,  0.3,  0.3,
    // Cara trasera
    -0.3, -0.3, -0.3,
    -0.3,  0.3, -0.3,
     0.3,  0.3, -0.3,
     0.3, -0.3, -0.3,
    // Cara superior
    -0.3,  0.3, -0.3,
    -0.3,  0.3,  0.3,
     0.3,  0.3,  0.3,
     0.3,  0.3, -0.3,
    // Cara inferior
    -0.3, -0.3, -0.3,
     0.3, -0.3, -0.3,
     0.3, -0.3,  0.3,
    -0.3, -0.3,  0.3,
    // Cara derecha
     0.3, -0.3, -0.3,
     0.3,  0.3, -0.3,
     0.3,  0.3,  0.3,
     0.3, -0.3,  0.3,
    // Cara izquierda
    -0.3, -0.3, -0.3,
    -0.3, -0.3,  0.3,
    -0.3,  0.3,  0.3,
    -0.3,  0.3, -0.3,
  ];

  const indices = [
     0,  1,  2,     0,  2,  3,    // Frontal
     4,  5,  6,     4,  6,  7,    // Trasera
     8,  9, 10,     8, 10, 11,    // Superior
    12, 13, 14,    12, 14, 15,    // Inferior
    16, 17, 18,    16, 18, 19,    // Derecha
    20, 21, 22,    20, 22, 23,    // Izquierda
  ];

  const colors = [
    // Cara frontal 
    1, 0, 0, 1,
    1, 0, 0, 1,
    1, 0, 0, 1,
    1, 0, 0, 1,
    // Cara trasera 
    0, 1, 0, 1,
    0, 1, 0, 1,
    0, 1, 0, 1,
    0, 1, 0, 1,
    // Cara superior 
    0, 0, 1, 1,
    0, 0, 1, 1,
    0, 0, 1, 1,
    0, 0, 1, 1,
    // Cara inferior 
    1, 1, 0, 1,
    1, 1, 0, 1,
    1, 1, 0, 1,
    1, 1, 0, 1,
    // Cara derecha 
    1, 0, 1, 1,
    1, 0, 1, 1,
    1, 0, 1, 1,
    1, 0, 1, 1,
    // Cara izquierda 
    0, 1, 1, 1,
    0, 1, 1, 1,
    0, 1, 1, 1,
    0, 1, 1, 1,
  ];

  return {
    a_position: { numComponents: 3, data: positions },
    a_color: { numComponents: 4, data: colors },
    indices: indices,
  };
}

// Iniciar el programa
main();
