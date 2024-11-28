'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';
// Remueve la importación de m4 desde starter_3D_lib
// import { m4 } from './starter_3D_lib';

const STATS_FREQUENCY = 60;

// Define los shaders
const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;

uniform vec4 u_color;
uniform mat4 u_matrix;

out vec4 v_color;

void main() {
  gl_Position = u_matrix * a_position;
  v_color = u_color;
}
`;

const fsGLSL = `#version 300 es
precision highp float;

in vec4 v_color;
uniform bool u_useUniformColor;

uniform vec4 u_color; // Uniform para color verde

out vec4 outColor;

void main() {
  if (u_useUniformColor) {
    outColor = u_color; // Usar color uniforme (verde)
  } else {
    outColor = v_color; // Usar color por atributo
  }
}
`;

// Define las clases de objetos 3D
class Building3D {
  constructor(id, position = [1, 1, 1], rotation = [0, 0, 0], scale = [1, 10, 1]) {
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = twgl.m4.identity();
  }
}

class Street3D {
  constructor(id, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 0, 1]) {
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = twgl.m4.identity();
  }
}

class TrafficLight3D {
  constructor(id, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], color = [0, 1, 0, 1]) {
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.color = color; // Guardar el color en RGBA
    this.matrix = twgl.m4.identity();
  }
}

class Car3D {
  constructor(id, position = [0, 0, 0], rotation = [0, 0, 0], scale = [0.02, 0.02, 0.02]) {
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = twgl.m4.identity();
  }
}

class Destination3D {
  constructor(id, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 5, 1]) {
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = twgl.m4.identity();
  }
}

// Define la URI del servidor
const agent_server_uri = "http://localhost:8585/";

// Inicializa los arrays para almacenar agentes y obstáculos
const cars = [];
const buildings = [];
const streets = [];
const trafficLights = [];
const destinations = [];

// Inicializa las variables relacionadas con WebGL
let gl, programInfo, streetArrays, buildingArrays, carArrays, destinationArrays, trafficLightArrays;
let streetBufferInfo, buildingBufferInfo, carBufferInfo, destinationBufferInfo, trafficLightBufferInfo;
let streetVao, buildingVao, carVao, destinationVao, trafficLightVao;

// Define la posición de la cámara
let cameraPosition = { x: 15, y: 10, z: 15 };

// Inicializa el conteo de frames
let frameCount = 0;

// Define el objeto de datos para la inicialización
const data = {
  map_file: '../city_files/map.txt', // Asegúrate de que esta ruta es correcta
  steps_dist_max: 100
};

// Cache para modelos cargados
const modelCache = {};

/**
 * Función para cargar y parsear modelos .obj
 */
async function loadModelObj(url) {
  if (modelCache[url]) {
    return modelCache[url];
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo .obj desde ${url}`);
    }
    const objText = await response.text();
    const modelData = loadObj(objText);
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, modelData);
    const vao = twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo);
    const model = { bufferInfo, vao };
    modelCache[url] = model;
    return model;
  } catch (error) {
    console.error(`Error al cargar el modelo .obj desde ${url}:`, error);
    throw error;
  }
}

/**
 * Función para cargar el modelo OBJ
 */
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

async function main() {
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');

  if (!gl) {
    console.error("WebGL2 no está soportado en este navegador.");
    return;
  }

  // Crear la información del programa usando los shaders
  programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  // Cargar modelos .obj
  const [buildingModel, carModel, flagModel, trafficLightModel] = await Promise.all([
    loadModelObj('../building.obj'),
    loadModelObj('../car.obj'),
    loadModelObj('../flag.obj'),
    loadModelObj('../light.obj'),  
    loadModelObj('../road.obj')
  ]);

  // Asignar los modelos cargados a las variables de buffer y VAO
  buildingBufferInfo = buildingModel.bufferInfo;
  buildingVao = buildingModel.vao;
  carBufferInfo = carModel.bufferInfo;
  carVao = carModel.vao;
  destinationBufferInfo = flagModel.bufferInfo;
  destinationVao = flagModel.vao;
  trafficLightBufferInfo = trafficLightModel.bufferInfo;
  trafficLightVao = trafficLightModel.vao;

  // Configurar la interfaz de usuario
  setupUI();

  // Inicializar el modelo de agentes
  await initAgentsModel();

  // Esperar brevemente para asegurar que el servidor ha inicializado el modelo
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Obtener agentes y obstáculos
  await getBuildings();
  await getStreets();
  await getDestinations();
  await getCars();
  await getTrafficLights();

  // Dibujar la escena
  drawScene();
}

/*
 * Inicializa el modelo de agentes enviando una solicitud POST al servidor.
 */
async function initAgentsModel() {
  try {
    // Enviar una solicitud POST al servidor para inicializar el modelo
    let response = await fetch(agent_server_uri + "init", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // Verificar si la respuesta fue exitosa
    if (response.ok) {
      // Parsear la respuesta como JSON y loguear el mensaje
      let result = await response.json();
      console.log(result.message);
    } else {
      console.error(`Failed to initialize model. Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response text:", errorText);
    }

  } catch (error) {
    // Loguear cualquier error que ocurra durante la solicitud
    console.error("Error during model initialization:", error);
  }
}

/*
 * Obtiene las posiciones actuales de todos los coches desde el servidor.
 */
/*
 * Obtiene las posiciones actuales de todos los coches desde el servidor.
 */
async function getCars() {
  try {
    // Enviar una solicitud GET al servidor para obtener las posiciones de los coches
    let response = await fetch(agent_server_uri + "getCars");

    // Verificar si la respuesta fue exitosa
    if (response.ok) {
      let result;
      try {
        // Parsear la respuesta como JSON
        result = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse JSON response from /getCars:", jsonError);
        const responseText = await response.text();
        console.error("Response text:", responseText);
        return; // Salir de la función ya que no podemos proceder sin JSON válido
      }

      // Loguear las posiciones de los coches
      console.log("Car positions received:", result.cars);

      // Verificar si el array de coches está vacío
      if (cars.length === 0) {
        // Crear nuevos coches y agregarlos al array de coches
        for (const car of result.cars) {
          // Determinar la rotación basada en la dirección
          let rotation;
          switch (car.direction) {
            case "Up":
              rotation = [0, 0, 0];
              break;
            case "Down":
              rotation = [0, Math.PI, 0];
              break;
            case "Left":
              rotation = [0, -Math.PI / 2, 0];
              break;
            case "Right":
              rotation = [0, Math.PI / 2, 0];
              break;
            case "Diagonal":
              rotation = [0, Math.PI / 4, 0];
              break;
            default:
              rotation = [0, 0, 0];
          }

          const newCar = new Car3D(
            car.id,
            [car.x, -3, car.z],        // Posición ajustada (y consistente)
            rotation,                   // Rotación basada en dirección
            [0.02, 0.02, 0.02]         // Escala
          );

          cars.push(newCar);
        }
        // Loguear el array de coches después de la inicialización
        console.log("Cars array after initialization:", cars);
      } else {
        // Actualizar las posiciones de los coches existentes
        for (const car of result.cars) {
          const current_car = cars.find((object3d) => object3d.id === car.id);

          if (current_car !== undefined) {
            // Actualizar la posición del coche
            current_car.position = [car.x, -3, car.z];

            // Actualizar la rotación basada en la dirección
            switch (car.direction) {
              case "Up":
                current_car.rotation = [0, 0, 0];
                break;
              case "Down":
                current_car.rotation = [0, Math.PI, 0];
                break;
              case "Left":
                current_car.rotation = [0, -Math.PI / 2, 0];
                break;
              case "Right":
                current_car.rotation = [0, Math.PI / 2, 0];
                break;
              case "Diagonal":
                current_car.rotation = [0, Math.PI / 4, 0];
                break;
              default:
                current_car.rotation = [0, 0, 0];
            }
          } else {
            // Coche no encontrado en el array, agregarlo
            console.warn(`Car with id ${car.id} not found in cars array. Adding new car.`);

            // Determinar la rotación basada en la dirección
            let rotation;
            switch (car.direction) {
              case "Up":
                rotation = [0, 0, 0];
                break;
              case "Down":
                rotation = [0, Math.PI, 0];
                break;
              case "Left":
                rotation = [0, -Math.PI / 2, 0];
                break;
              case "Right":
                rotation = [0, Math.PI / 2, 0];
                break;
              case "Diagonal":
                rotation = [0, Math.PI / 4, 0];
                break;
              default:
                rotation = [0, 0, 0];
            }

            const newCar = new Car3D(
              car.id,
              [car.x, -3, car.z],
              rotation,
              [0.02, 0.02, 0.02]
            );

            cars.push(newCar);
          }
        }}
      }
    } catch (error) {
      // Loguear cualquier error que ocurra durante la solicitud
      console.error("Error fetching /getCars:", error);
    }
}


/*
 * Obtiene las posiciones actuales de todos los edificios desde el servidor.
 */
async function getBuildings() {
  try {
    // Enviar una solicitud GET al servidor para obtener las posiciones de los edificios
    let response = await fetch(agent_server_uri + "getBuildings");

    // Verificar si la respuesta fue exitosa
    if (response.ok) {
      // Parsear la respuesta como JSON
      let result = await response.json();

      // Crear nuevos edificios y agregarlos al array de edificios
      for (const building of result.buildings) {
        const newBuilding = new Building3D(
          building.id,
          [building.x, -3, building.z], // Posición ajustada
          [0, 0, 0],                       // Rotación (sin cambios)
          [1, 4, 1]                        // Escala
        );
        buildings.push(newBuilding);
      }
      // Loguear el array de edificios
      console.log("Buildings:", buildings);
    } else {
      console.error(`Failed to fetch /getBuildings. Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response text:", errorText);
    }

  } catch (error) {
    // Loguear cualquier error que ocurra durante la solicitud
    console.error("Error fetching /getBuildings:", error);
  }
}


/*
 * Obtiene las posiciones actuales de todas las calles desde el servidor.
 */
async function getStreets() {
  try {
    // Enviar una solicitud GET al servidor para obtener las posiciones de las calles
    let response = await fetch(agent_server_uri + "getStreets");

    // Verificar si la respuesta fue exitosa
    if (response.ok) {
      // Parsear la respuesta como JSON
      let result = await response.json();

      // Crear nuevas calles y agregarlas al array de calles
      for (const street of result.streets) {
        const newStreet = new Street3D(
          street.id,
          [street.x, 0, street.z], // Posición ajustada
          [0, 0, 0],               // Rotación (sin cambios)
          [1, 1, 1]                // Escala
        );
        streets.push(newStreet);
      }
      // Loguear el array de calles
      console.log("Streets:", streets);
    } else {
      console.error(`Failed to fetch /getStreets. Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response text:", errorText);
    }

  } catch (error) {
    // Loguear cualquier error que ocurra durante la solicitud
    console.error("Error fetching /getStreets:", error);
  }
}

/*
 * Obtiene las posiciones actuales de todos los destinos desde el servidor.
 */
async function getDestinations() {
  try {
    // Enviar una solicitud GET al servidor para obtener las posiciones de los destinos
    let response = await fetch(agent_server_uri + "getDestinations");

    // Verificar si la respuesta fue exitosa
    if (response.ok) {
      // Parsear la respuesta como JSON
      let result = await response.json();

      for (const destination of result.destinations) {
        const newDestination = new Destination3D(
          destination.id,
          [destination.x, -3, destination.z], // Posición ajustada
          [0, 0, 0],                           // Rotación (sin cambios)
          [1, 1, 1]                            // Escala adecuada para flag.obj
        );
        destinations.push(newDestination);
      }

      // Loguear el array de destinos
      console.log("Destinations:", destinations);
    } else {
      console.error(`Failed to fetch /getDestinations. Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response text:", errorText);
    }

  } catch (error) {
    // Loguear cualquier error que ocurra durante la solicitud
    console.error("Error fetching /getDestinations:", error);
  }
}

/*
 * Obtiene los estados y posiciones actuales de todos los semáforos desde el servidor.
 */
async function getTrafficLights() {
  try {
    // Enviar una solicitud GET al servidor para obtener las posiciones de los semáforos
    let response = await fetch(agent_server_uri + "getTrafficLights");

    // Verificar si la respuesta fue exitosa
    if (response.ok) {
      // Parsear la respuesta como JSON
      let result = await response.json();

      if (trafficLights.length === 0) {
        // Crear nuevos semáforos y agregarlos al array trafficLights
        for (const light of result.traffic_lights) {
          // Mapear el color de "green" o "red" a un array RGBA
          const color = light.color === "green" ? [0, 1, 0, 1] : [1, 0, 0, 1];

          const newTrafficLight = new TrafficLight3D(
            light.id,
            [light.x, -1.1, light.z], // Posición ajustada
            [0, 0, 0],               // Rotación (sin cambios)
            [0.3, 0.3, 0.3],               // Escala
            color                    // Color basado en el estado
          );
          trafficLights.push(newTrafficLight);
        }

        // Loguear los semáforos cargados
        console.log("Traffic Lights:", trafficLights);
      } else {
        // Actualizar los estados y posiciones de los semáforos existentes
        for (const light of result.traffic_lights) {
          const current_light = trafficLights.find((tl) => tl.id === light.id);

          // Verificar si el semáforo existe en el array
          if (current_light !== undefined) {
            // Actualizar la posición
            current_light.position = [light.x, 0.5, light.z];

            // Actualizar el color según el estado
            current_light.color = light.color === "green" ? [0, 1, 0, 1] : [1, 0, 0, 1];
          } else {
            // Semáforo no encontrado en el array, agregarlo
            console.warn(`Traffic Light with id ${light.id} not found in trafficLights array. Adding new traffic light.`);
            const color = light.color === "green" ? [0, 1, 0, 1] : [1, 0, 0, 1];
            const newTrafficLight = new TrafficLight3D(
              light.id,
              [light.x, 0.5, light.z],
              [0, 0, 0],
              [1, 1, 1],
              color
            );
            trafficLights.push(newTrafficLight);
          }
        }
      }
    } else {
      // La respuesta no fue exitosa, loguear el estado y la respuesta
      console.error(`Failed to fetch /getTrafficLights. Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response text:", errorText);
    }

  } catch (error) {
    // Loguear cualquier error que ocurra durante la solicitud
    console.error("Error fetching /getTrafficLights:", error);
  }
}
/*
 * Actualiza las posiciones de los coches enviando una solicitud al servidor.
 */
async function update() {
  try {
    // Enviar una solicitud al servidor para actualizar las posiciones de los coches
    let response = await fetch(agent_server_uri + "update");

    // Verificar si la respuesta fue exitosa
    if (response.ok) {
      // Obtener las posiciones actualizadas de los coches
      await getCars();
      // Loguear un mensaje indicando que los agentes han sido actualizados
      console.log("Updated agents");
    } else {
      console.error(`Failed to update model. Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response text:", errorText);
    }

  } catch (error) {
    // Loguear cualquier error que ocurra durante la solicitud
    console.error("Error updating the model:", error);
  }
}

/**
 * Obtiene la cantidad de coches actualmente en el grid desde el servidor.
 * @returns {Number|null} Cantidad de coches en el grid o null si hay un error.
 */
 async function getCarsInGrid() {
  try {
      let response = await fetch(agent_server_uri + "countCarsInGrid");
      if (response.ok) {
          let data = await response.json();
          console.log("Cantidad de coches en el grid:", data.cars_in_grid);
          return data.cars_in_grid;
      } else {
          console.error(`Fallo al obtener la cantidad de coches en el grid. Estado: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error("Texto de la respuesta:", errorText);
          return null;
      }
  } catch (error) {
      console.error("Error al obtener la cantidad de coches en el grid:", error);
      return null;
  }
}

/**
* Obtiene la cantidad de coches que han llegado a su destino desde el servidor.
* @returns {Number|null} Cantidad de coches que han llegado a su destino o null si hay un error.
*/
async function getCarsReachedDestination() {
  try {
      let response = await fetch(agent_server_uri + "countCarsReachedDestination");
      if (response.ok) {
          let data = await response.json();
          console.log("Cantidad de coches que han llegado al destino:", data.cars_reached_destination);
          return data.cars_reached_destination;
      } else {
          console.error(`Fallo al obtener la cantidad de coches que han llegado al destino. Estado: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error("Texto de la respuesta:", errorText);
          return null;
      }
  } catch (error) {
      console.error("Error al obtener la cantidad de coches que han llegado al destino:", error);
      return null;
  }
}

/**
* Recolecta estadísticas de la simulación.
*/
async function collectStatistics() {
  const carsInGrid = await getCarsInGrid();
  const carsReachedDestination = await getCarsReachedDestination();

  // Mostrar en la consola
  console.log(`Estadísticas de la Simulación - Coches en el Grid: ${carsInGrid}, Coches que Llegaron al Destino: ${carsReachedDestination}`);

  // Actualizar elementos HTML (si tienes)
  /*
  document.getElementById('carsInGrid').innerText = `Coches en el Grid: ${carsInGrid}`;
  document.getElementById('carsReachedDestination').innerText = `Coches que Llegaron al Destino: ${carsReachedDestination}`;
  */
}

/*
 * Dibuja la escena renderizando los agentes y obstáculos.
 */
async function drawScene() {
  // Redimensionar el canvas para coincidir con el tamaño de visualización
  twgl.resizeCanvasToDisplaySize(gl.canvas);

  // Establecer el viewport para coincidir con el tamaño del canvas
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Establecer el color de limpieza y habilitar la prueba de profundidad
  gl.clearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  // Limpiar los buffers de color y profundidad
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Usar el programa
  gl.useProgram(programInfo.program);

  // Configurar la matriz de vista-proyección
  const viewProjectionMatrix = setupWorldView(gl);

  // Dibujar las calles
  drawStreets(streetVao, streetBufferInfo, viewProjectionMatrix);
  // Dibujar los edificios
  drawBuildings(buildingVao, buildingBufferInfo, viewProjectionMatrix);
  // Dibujar los coches
  drawCars(carVao, carBufferInfo, viewProjectionMatrix);
  // Dibujar los destinos
  drawDestinations(destinationVao, destinationBufferInfo, viewProjectionMatrix);
  // Dibujar los semáforos
  drawTrafficLights(trafficLightVao, trafficLightBufferInfo, viewProjectionMatrix);

  // Incrementar el conteo de frames
  frameCount++;

  // Recolectar estadísticas cada STATS_FREQUENCY frames
  if (frameCount % STATS_FREQUENCY === 0) {
    frameCount = 0;
    await collectStatistics();
  }

  // Actualizar la escena cada 30 frames
  if (frameCount % 30 === 0) {
    frameCount = 0;
    await update();
  }

  // Solicitar el siguiente frame
  requestAnimationFrame(drawScene);
}

/*
 * Dibuja los coches.
 */
/*
 * Dibuja los coches.
 */
function drawCars(carVao, carBufferInfo, viewProjectionMatrix) {
  if (cars.length === 0) {
    console.log("No hay coches para dibujar.");
    return;
  }

  // Vincular el VAO para coches
  gl.bindVertexArray(carVao);

  // Iterar sobre los coches
  for (const car of cars) {
    // Crear la matriz de transformación del coche
    car.matrix = twgl.m4.identity();
    twgl.m4.translate(car.matrix, car.position, car.matrix);
    twgl.m4.rotateX(car.matrix, car.rotation[0], car.matrix);
    twgl.m4.rotateY(car.matrix, car.rotation[1], car.matrix);
    twgl.m4.rotateZ(car.matrix, car.rotation[2], car.matrix);
    twgl.m4.scale(car.matrix, car.scale, car.matrix);
    twgl.m4.multiply(viewProjectionMatrix, car.matrix, car.matrix);

    // Establecer los uniformes para el coche
    let uniforms = {
      u_matrix: car.matrix,
      u_color: [1.0, 1.0, 0.0, 1.0], // Amarillo para los coches
      u_useUniformColor: true
    };

    // Establecer los uniformes y dibujar el coche
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, carBufferInfo);
    console.log(`Coche dibujado: ID=${car.id}, Rotación=${car.rotation}`);
  }
}


/*
 * Dibuja las calles.
 */
function drawStreets(streetVao, streetBufferInfo, viewProjectionMatrix) {
  // Vincular el VAO para calles
  gl.bindVertexArray(streetVao);

  // Iterar sobre las calles
  for (const street of streets) {
    // Crear la matriz de transformación de la calle
    street.matrix = twgl.m4.identity();
    twgl.m4.translate(street.matrix, street.position, street.matrix);
    twgl.m4.rotateX(street.matrix, street.rotation[0], street.matrix);
    twgl.m4.rotateY(street.matrix, street.rotation[1], street.matrix);
    twgl.m4.rotateZ(street.matrix, street.rotation[2], street.matrix);
    twgl.m4.scale(street.matrix, street.scale, street.matrix);
    twgl.m4.multiply(viewProjectionMatrix, street.matrix, street.matrix);

    // Establecer los uniformes para la calle
    let uniforms = {
      u_matrix: street.matrix,
      u_color: [0.0, 0.0, 0.0, 1.0], // Negro para las calles
      u_useUniformColor: true
    };

    // Establecer los uniformes y dibujar la calle
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, streetBufferInfo);
  }
}

/*
 * Dibuja los edificios.
 */
function drawBuildings(buildingVao, buildingBufferInfo, viewProjectionMatrix) {
  // Vincular el VAO para edificios
  gl.bindVertexArray(buildingVao);

  // Iterar sobre los edificios
  for (const building of buildings) {
    // Crear la matriz de transformación del edificio
    building.matrix = twgl.m4.identity();
    twgl.m4.translate(building.matrix, building.position, building.matrix);
    twgl.m4.rotateX(building.matrix, building.rotation[0], building.matrix);
    twgl.m4.rotateY(building.matrix, building.rotation[1], building.matrix);
    twgl.m4.rotateZ(building.matrix, building.rotation[2], building.matrix);
    twgl.m4.scale(building.matrix, building.scale, building.matrix);
    twgl.m4.multiply(viewProjectionMatrix, building.matrix, building.matrix);

    // Establecer los uniformes para el edificio
    let uniforms = {
      u_matrix: building.matrix,
      u_color: [0.9, 0.9, 0.9, 1.0], // Gris claro para edificios
      u_useUniformColor: true
    };

    // Establecer los uniformes y dibujar el edificio
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, buildingBufferInfo);
  }
}

/*
 * Dibuja los destinos.
 */
function drawDestinations(destinationVao, destinationBufferInfo, viewProjectionMatrix) {
  // Vincular el VAO para destinos
  gl.bindVertexArray(destinationVao);

  // Iterar sobre los destinos
  for (const destination of destinations) {
    // Crear la matriz de transformación del destino
    destination.matrix = twgl.m4.identity();
    twgl.m4.translate(destination.matrix, destination.position, destination.matrix);
    twgl.m4.rotateX(destination.matrix, destination.rotation[0], destination.matrix);
    twgl.m4.rotateY(destination.matrix, destination.rotation[1], destination.matrix);
    twgl.m4.rotateZ(destination.matrix, destination.rotation[2], destination.matrix);
    twgl.m4.scale(destination.matrix, destination.scale, destination.matrix);
    twgl.m4.multiply(viewProjectionMatrix, destination.matrix, destination.matrix);

    // Establecer los uniformes para el destino
    let uniforms = {
      u_matrix: destination.matrix,
      u_color: [0, 1, 0, 1], // Verde para destinos
      u_useUniformColor: true
    };

    // Establecer los uniformes y dibujar el destino
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, destinationBufferInfo);
  }
}

/*
 * Dibuja los semáforos.
 */
function drawTrafficLights(trafficLightVao, trafficLightBufferInfo, viewProjectionMatrix) {
  if (!trafficLightVao) {
    console.error("Traffic Light VAO is not initialized.");
    return;  // Salir temprano si el VAO no está disponible.
  }

  // Vincular el VAO para semáforos
  gl.bindVertexArray(trafficLightVao);

  // Iterar sobre los semáforos
  for (const trafficLight of trafficLights) {
    // Crear la matriz de transformación del semáforo
    trafficLight.matrix = twgl.m4.identity();
    twgl.m4.translate(trafficLight.matrix, trafficLight.position, trafficLight.matrix);
    twgl.m4.rotateX(trafficLight.matrix, trafficLight.rotation[0], trafficLight.matrix);
    twgl.m4.rotateY(trafficLight.matrix, trafficLight.rotation[1], trafficLight.matrix);
    twgl.m4.rotateZ(trafficLight.matrix, trafficLight.rotation[2], trafficLight.matrix);
    twgl.m4.scale(trafficLight.matrix, trafficLight.scale, trafficLight.matrix);
    twgl.m4.multiply(viewProjectionMatrix, trafficLight.matrix, trafficLight.matrix);

    if (trafficLight.state == true) {
      trafficLight.color = [1.0,0.0,0.0,1.0];
    } else if (trafficLight.state == false) {
      trafficLight.color = [0.0,1.0,0.0,1.0];
    }

    //Establecer los uniformes para el semáforo
    let uniforms = {
      u_matrix: trafficLight.matrix,
      u_color: trafficLight.color, // Color basado en el estado
      u_useUniformColor: true
    };

    // Establecer los uniformes y dibujar el semáforo
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, trafficLightBufferInfo);
  }
}

/*
 * Configura la vista del mundo creando la matriz de vista-proyección.
 */
function setupWorldView(gl) {
  // Establecer el campo de visión (FOV) en radianes
  const fov = 45 * Math.PI / 180;

  // Calcular la relación de aspecto del canvas
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  // Crear la matriz de proyección
  const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);

  // Establecer la posición objetivo
  const target = [0, 0, 0];

  // Establecer el vector 'up'
  const up = [0, 1, 0];

  // Calcular la posición de la cámara
  const camPos = [cameraPosition.x, cameraPosition.y, cameraPosition.z];

  // Crear la matriz de la cámara
  const cameraMatrix = twgl.m4.lookAt(camPos, target, up);

  // Calcular la matriz de vista
  const viewMatrix = twgl.m4.inverse(cameraMatrix);

  // Calcular la matriz de vista-proyección
  const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

  // Devolver la matriz de vista-proyección
  return viewProjectionMatrix;
}

/*
 * Configura la interfaz de usuario (UI) para la posición de la cámara.
 */
function setupUI() {
  // Crear una nueva instancia de GUI
  const gui = new GUI();

  // Crear una carpeta para la posición de la cámara
  const posFolder = gui.addFolder('Position:');

  // Añadir un slider para el eje x
  posFolder.add(cameraPosition, 'x', -50, 50)
    .onChange(value => {
      // Actualizar la posición de la cámara cuando cambia el valor del slider
      cameraPosition.x = value;
    });

  // Añadir un slider para el eje y
  posFolder.add(cameraPosition, 'y', -50, 50)
    .onChange(value => {
      // Actualizar la posición de la cámara cuando cambia el valor del slider
      cameraPosition.y = value;
    });

  // Añadir un slider para el eje z
  posFolder.add(cameraPosition, 'z', -50, 50)
    .onChange(value => {
      // Actualizar la posición de la cámara cuando cambia el valor del slider
      cameraPosition.z = value;
    });
}

/**
 * Genera datos básicos para objetos simples.
 * @param {Number} size - Factor de escala.
 * @returns {Object} Arrays para buffer.
 */
function generateData(size) {
  let arrays = {
    a_position: {
      numComponents: 3,
      data: [
        // Front Face
        -0.5, -0.5,  0.5,
         0.5, -0.5,  0.5,
         0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,

        // Back face
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5, -0.5, -0.5,

        // Top face
        -0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,
         0.5,  0.5,  0.5,
         0.5,  0.5, -0.5,

        // Bottom face
        -0.5, -0.5, -0.5,
         0.5, -0.5, -0.5,
         0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,

        // Right face
         0.5, -0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5,  0.5,  0.5,
         0.5, -0.5,  0.5,

        // Left face
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5
      ].map(e => size * e)
    },
    a_color: {
      numComponents: 4,
      data: [
        // Front face
        0, 0, 0, 1, // v_1
        0, 0, 0, 1, // v_2
        0, 0, 0, 1, // v_3
        0, 0, 0, 1, // v_4

        // Back Face
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,

        // Top Face
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,

        // Bottom Face
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,

        // Right Face
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,

        // Left Face
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1,
      ]
    },
    indices: {
      numComponents: 3,
      data: [
        0, 1, 2,      0, 2, 3,    // Front face
        4, 5, 6,      4, 6, 7,    // Back face
        8, 9, 10,     8, 10, 11,  // Top face
        12, 13, 14,   12, 14, 15, // Bottom face
        16, 17, 18,   16, 18, 19, // Right face
        20, 21, 22,   20, 22, 23  // Left face
      ]
    }
  };

  return arrays;
}

/**
 * Función principal que inicia la aplicación.
 */
main();

