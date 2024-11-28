'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';
import { m4 } from './starter_3D_lib';


// Define the vertex shader code, using GLSL 3.00
const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;

uniform vec4 u_color;
uniform mat4 u_transforms;
uniform mat4 u_matrix;

out vec4 v_color;

void main() {
  gl_Position = u_matrix * a_position;
  v_color = u_color;
}

`;

// Define the fragment shader code, using GLSL 3.00
const fsGLSL = `#version 300 es
precision highp float;

in vec4 v_color;
uniform bool v_useUniformColor;

uniform vec4 u_color; // Uniform para color verde

out vec4 outColor;

void main() {
  if (v_useUniformColor) {
    outColor = u_color; // Usar color uniforme (verde)
  } else {
    outColor = v_color; // Usar color por atributo
  }
}

`;

// Define the Object3D class to represent 3D objects
class Building3D {
  constructor(id, position=[1,1,1], rotation=[0,0,0], scale=[1,10,1]){
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = m4.identity();
  }
}

class Street3D {
  constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[1,0,1]){
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = m4.identity();
  }
}

class TrafficLight3D {
  constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[1,1,1], color=[1,1,1]){
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = m4.identity();
  }
}

class Car3D {
  constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[1,1,1]){
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = m4.identity();
  }
}

class Destination3D {
  constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[1,5,1]){
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.matrix = m4.identity();
  }
}
// Define the car server URI
const agent_server_uri = "http://localhost:5175/";

// Initialize arrays to store agents and obstacles
const cars = [];
const buildings = [];
const streets = [];
const trafficLights = [];
const destinations = [];

// Initialize WebGL-related variables
let gl, programInfo, streetArrays, buildingArrays, carArrays, destinationArrays, trafficLightArrays, streetBufferInfo, buildingBufferInfo, 
carBufferInfo, destinationBufferInfo, trafficLightBufferInfo, streetVao, buildingVao, carVao, destinationVao, trafficLightVao;

// Define the camera position
let cameraPosition = {x:0, y:0, z:0};

// Initialize the frame count
let frameCount = 0;

// Define the data object
const data = {
  NAgents: 500,
  width: 100,
  height: 100
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

  // Crear la información del programa usando los shaders
  programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  // Cargar modelos .obj
  const [buildingModel, carModel, flagModel, trafficLightModel] = await Promise.all([
    loadModelObj('../building.obj'), // Reemplaza con la ruta correcta
    loadModelObj('../car.obj'),
    loadModelObj('../flag.obj'),
    loadModelObj('../light.obj')          // Reemplaza con la ruta correcta
  ]);
  
  console.log(trafficLightModel)


  // Asignar los modelos cargados a las variables de buffer y VAO
  buildingBufferInfo = buildingModel.bufferInfo;
  buildingVao = buildingModel.vao;
  carBufferInfo = carModel.bufferInfo;
  carVao = carModel.vao;
  destinationBufferInfo = flagModel.bufferInfo;
  destinationVao = flagModel.vao;
  trafficLightBufferInfo = trafficLightModel.bufferInfo;
  trafficLightVao = trafficLightModel.vao

  // Generar datos para calles y destinos
  streetArrays = generateData(1);
  // destinationArrays = generateDataD(1);

  // Crear buffer info para calles y destinos
  streetBufferInfo = twgl.createBufferInfoFromArrays(gl, streetArrays);
  // destinationBufferInfo = twgl.createBufferInfoFromArrays(gl, destinationArrays);

  // Crear VAOs para calles y destinos
  streetVao = twgl.createVAOFromBufferInfo(gl, programInfo, streetBufferInfo);
  // destinationVao = twgl.createVAOFromBufferInfo(gl, programInfo, destinationBufferInfo);

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
  await drawScene(gl, programInfo, streetVao, streetBufferInfo, buildingVao, buildingBufferInfo, carVao, carBufferInfo, destinationVao, destinationBufferInfo, trafficLightBufferInfo, trafficLightVao);
}

/*
 * Initializes the agents model by sending a POST request to the car server.
 */
async function initAgentsModel() {
  try {
    // Send a POST request to the car server to initialize the model
    let response = await fetch(agent_server_uri + "init", {
      method: 'POST', 
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    })

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON and log the message
      let result = await response.json()
      console.log(result.message)
    }
      
  } catch (error) {
    // Log any errors that occur during the request
    console.log(error)    
  }
}

/*
 * Retrieves the current positions of all agents from the car server.
 */
async function getCars() {
  try {
    // Send a GET request to the car server to retrieve the car positions
    let response = await fetch(agent_server_uri + "getCars");

    // Check if the response was successful
    if (response.ok) {
      let result;
      try {
        // Parse the response as JSON
        result = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse JSON response from /getCars:", jsonError);
        const responseText = await response.text();
        console.error("Response text:", responseText);
        return; // Exit the function since we cannot proceed without valid JSON
      }

      // Log the car positions
      console.log("Car positions received:", result.positions);

      // Check if the positions are valid
      if (!Array.isArray(result.positions)) {
        console.error("Invalid positions data received from /getCars:", result.positions);
        return;
      }

      // Check if the cars array is empty
      if (cars.length === 0) {
        // Create new cars and add them to the cars array
        for (const car of result.positions) {
          const newCar = new Car3D(
            car.id,
            [car.x, car.y, car.z],
            [0, 0, 0],          // Rotación (sin cambios)
            [0.02, 0.02, 0.02]           // Escala de 1
          );
          cars.push(newCar);
        }
        // Log the cars array
        console.log("Cars array after initialization:", cars);
      } else {
        // Update the positions of existing cars
        for (const car of result.positions) {
          const current_car = cars.find((object3d) => object3d.id === car.id);

          // Check if the car exists in the cars array
          if (current_car !== undefined) {
            // Update the car's position
            current_car.position = [car.x, car.y, car.z];
          } else {
            // Car not found in the array, perhaps add it
            console.warn(`Car with id ${car.id} not found in cars array.`);
            const newCar = new Car3D(car.id, [car.x, car.y, car.z]);
            cars.push(newCar);
          }
        }
      }
    } else {
      // Response was not OK, log the status and response
      console.error(`Failed to fetch /getCars. Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response text:", errorText);
    }
  } catch (error) {
    // Log any errors that occur during the request
    console.error("Error fetching /getCars:", error);
  }
}


/*
 * Retrieves the current positions of all obstacles from the car server.
 */
async function getBuildings() {
  try {
    // Send a GET request to the car server to retrieve the building positions
    let response = await fetch(agent_server_uri + "getBuildings") 

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON
      let result = await response.json()

      // Create new obstacles and add them to the obstacles array
      for (const building of result.positions) {
        const newBuilding = new Building3D(
          building.id,
          [building.x, building.y-5, building.z],
          [0, 0, 0],          // Rotación (sin cambios)
          [1, 5, 1]     // Escala más pequeña
        );
        buildings.push(newBuilding);
        }        
      // Log the obstacles array
      console.log("Buildings:", buildings)
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

async function getStreets() {
  try {
    // Send a GET request to the car server to retrieve the building positions
    let response = await fetch(agent_server_uri + "getStreets") 

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON
      let result = await response.json()

      // Create new obstacles and add them to the obstacles array
      for (const street of result.positions) {
        const newStreet = new Street3D(street.id, [street.x, street.y, street.z])
        streets.push(newStreet)
      }
      // Log the obstacles array
      console.log("Streets:", streets)
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

async function getDestinations() {
  try {
    // Send a GET request to the car server to retrieve the destination positions
    let response = await fetch(agent_server_uri + "getDestinations");

    // Check if the response was successful
    if (response.ok) {
      // Parse the response as JSON
      let result = await response.json();

      

      for (const destination of result.positions) {
        const newDestination = new Destination3D(
          destination.id,
          [destination.x, destination.y-5, destination.z],
          [0, 0, 0],          // Rotación (sin cambios)
          [1, 1, 1]           // Escala adecuada para flag.obj
        );
        destinations.push(newDestination);
      }

      // Log the destinations array
      console.log("Destinations:", destinations);
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error);
  }
}

async function getTrafficLights() {
  try {
    // Send a GET request to the server to retrieve the traffic light states
    let response = await fetch(agent_server_uri + "getTrafficLights");

    // Check if the response was successful
    if (response.ok) {
      // Parse the response as JSON
      let result = await response.json();

      // Check if the trafficLights array is empty
      if (trafficLights.length === 0) {
        // Create new traffic lights and add them to the trafficLights array
        for (const light of result.positions) {
          const newTrafficLight = new TrafficLight3D(
            light.id,
            [light.x, light.y, light.z, light.a], // Position
            [light.r, light.g, light.b, light.a] // Initial color
          );
          trafficLights.push(newTrafficLight);
        }
        // Log the trafficLights array
        console.log("Traffic Lights:", trafficLights);

      } else {
        // Update the properties of existing traffic lights
        for (const light of result.positions) {
          const currentLight = trafficLights.find((object3d) => object3d.id === light.id);

          // Check if the traffic light exists in the trafficLights array
          if (currentLight !== undefined) {
            // Update the traffic light's position and color
            currentLight.position = [light.x, light.y, light.z];
            currentLight.color = [light.r, light.g, light.b, light.a];
          }
        }
      }
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log("Error fetching traffic lights:", error);
  }
}

/*
 * Updates the car positions by sending a request to the car server.
 */
async function update() {
  try {
    // Send a request to the car server to update the car positions
    let response = await fetch(agent_server_uri + "update") 

    // Check if the response was successful
    if(response.ok){
      // Retrieve the updated car positions
      await getCars()
      // Log a message indicating that the agents have been updated
      console.log("Updated agents")
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

/*
 * Draws the scene by rendering the agents and obstacles.
 * 
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @param {Object} programInfo - The program information.
 * @param {WebGLVertexArrayObject} streetVao - The vertex array object for agents.
 * @param {Object} streetBufferInfo - The buffer information for agents.
 * @param {WebGLVertexArrayObject} buildingVao - The vertex array object for obstacles.
 * @param {Object} buildingBufferInfo - The buffer information for obstacles.
 */
async function drawScene(gl, programInfo, streetVao, streetBufferInfo, buildingVao, buildingBufferInfo, carVao, carBufferInfo, destinationVao, destinationBufferInfo, trafficLightBufferInfo, trafficLightVao) {
    // Resize the canvas to match the display size
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Set the viewport to match the canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set the clear color and enable depth testing
    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.enable(gl.DEPTH_TEST);

    // Clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use the program
    gl.useProgram(programInfo.program);

    // Set up the view-projection matrix
    const viewProjectionMatrix = setupWorldView(gl);

    // Set the distance for rendering
    const distance = 1

    // Draw the agents
    drawStreets(distance, streetVao, streetBufferInfo, viewProjectionMatrix)    
    // Draw the obstacles
    drawBuildings(distance, buildingVao, buildingBufferInfo, viewProjectionMatrix)

    drawCars(distance, carVao, carBufferInfo, viewProjectionMatrix)

    drawDestinations(distance, destinationVao, destinationBufferInfo, viewProjectionMatrix)

    drawTrafficLights(distance, trafficLightBufferInfo, trafficLightVao, viewProjectionMatrix)
    // Increment the frame count
    frameCount++

    // Update the scene every 30 frames
    if(frameCount%30 == 0){
      frameCount = 0
      await update()
    } 

    // Request the next frame
    requestAnimationFrame(()=>drawScene(gl, programInfo, streetVao, streetBufferInfo, buildingVao, buildingBufferInfo, carVao, carBufferInfo, destinationVao, destinationBufferInfo, trafficLightBufferInfo, trafficLightVao))
}

/*
 * Draws the agents.
 * 
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} streetVao - The vertex array object for agents.
 * @param {Object} streetBufferInfo - The buffer information for agents.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawCars(distance, carVao, carBufferInfo, viewProjectionMatrix){
    // Bind the vertex array object for agents
    gl.bindVertexArray(carVao);

    // Iterate over the agents
    for(const car of cars){

      // Create the car's transformation matrix
      const cube_trans = twgl.v3.create(...car.position);
      const cube_scale = twgl.v3.create(...car.scale);

      // Calculate the car's matrix
      car.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      car.matrix = twgl.m4.rotateX(car.matrix, car.rotation[0]);
      car.matrix = twgl.m4.rotateY(car.matrix, car.rotation[1]);
      car.matrix = twgl.m4.rotateZ(car.matrix, car.rotation[2]);
      car.matrix = twgl.m4.scale(car.matrix, cube_scale);

      // Set the uniforms for the car
      let uniforms = {
      u_matrix: car.matrix,
      u_color: [1.0, 1.0, 0.0, 1.0],
      u_useUniformColor: true // Activar el uso de color uniforme
      
      }

      // Set the uniforms and draw the car
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, carBufferInfo);
      
    }
}

function drawStreets(distance, streetVao, streetBufferInfo, viewProjectionMatrix){
  // Bind the vertex array object for agents
  gl.bindVertexArray(streetVao);

  // Iterate over the agents
  for(const street of streets){

    // Create the car's transformation matrix
    const cube_trans = twgl.v3.create(...street.position);
    const cube_scale = twgl.v3.create(...street.scale);

    // Calculate the car's matrix
    street.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
    street.matrix = twgl.m4.rotateX(street.matrix, street.rotation[0]);
    street.matrix = twgl.m4.rotateY(street.matrix, street.rotation[1]);
    street.matrix = twgl.m4.rotateZ(street.matrix, street.rotation[2]);
    street.matrix = twgl.m4.scale(street.matrix, cube_scale);

    // Set the uniforms for the car
    let uniforms = {
      u_matrix: street.matrix,
      u_color: [0.0, 0.0, 0.0, 1.0], 
      u_useUniformColor: true // Activar el uso de color uniforme
      
      }

    // Set the uniforms and draw the car
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, streetBufferInfo);
    
  }
}  

/*
 * Draws the destinations using flag.obj with a uniform color (green).
 * 
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} destinationVao - The VAO for destinations.
 * @param {Object} destinationBufferInfo - The buffer info for destinations.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawDestinations(distance, destinationVao, destinationBufferInfo, viewProjectionMatrix) {
  // Vincular el VAO para destinos
  gl.bindVertexArray(destinationVao);

  // Iterar sobre los destinos
  for (const destination of destinations) {

    // Crear el vector de traslación para la posición del destino
    const dest_trans = twgl.v3.create(...destination.position);
    const dest_scale = twgl.v3.create(...destination.scale);

    // Calcular la matriz de transformación del destino
    destination.matrix = twgl.m4.translate(viewProjectionMatrix, dest_trans);
    destination.matrix = twgl.m4.rotateX(destination.matrix, destination.rotation[0]);
    destination.matrix = twgl.m4.rotateY(destination.matrix, destination.rotation[1]);
    destination.matrix = twgl.m4.rotateZ(destination.matrix, destination.rotation[2]);
    destination.matrix = twgl.m4.scale(destination.matrix, dest_scale);

    // Establecer los uniformes para el destino
    let uniforms = {
      u_matrix: destination.matrix,
      u_color: [0, 1, 0, 1], // Verde en RGBA
      u_useUniformColor: true // Activar el uso de color uniforme
    }

    // Establecer los uniformes y dibujar el destino
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, destinationBufferInfo);
  }
}

/*
 * Draws the obstacles.
 * 
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} buildingVao - The vertex array object for obstacles.
 * @param {Object} buildingBufferInfo - The buffer information for obstacles.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawBuildings(distance, buildingVao, buildingBufferInfo, viewProjectionMatrix){
    // Bind the vertex array object for obstacles
    gl.bindVertexArray(buildingVao);

    // Iterate over the obstacles
    for(const building of buildings){
      // Create the building's transformation matrix
      const cube_trans = twgl.v3.create(...building.position);
      const cube_scale = twgl.v3.create(...building.scale);

      // Calculate the building's matrix
      building.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      building.matrix = twgl.m4.rotateX(building.matrix, building.rotation[0]);
      building.matrix = twgl.m4.rotateY(building.matrix, building.rotation[1]);
      building.matrix = twgl.m4.rotateZ(building.matrix, building.rotation[2]);
      building.matrix = twgl.m4.scale(building.matrix, cube_scale);

      // Set the uniforms for the building
      let uniforms = {
        u_matrix: building.matrix,
        u_color: [0.9, 0.9, 0.9, 1.0], // Gris claro,
        u_useUniformColor: true // Activar el uso de color uniforme
        
        }

      // Set the uniforms and draw the building
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, buildingBufferInfo);
      
    }
}

function drawTrafficLights(distance, trafficLightVao, trafficLightBufferInfo, viewProjectionMatrix) {
  if (!trafficLightVao) {
    console.error("Traffic Light VAO is not initialized.");
    return;  // Early return if the VAO is not available.
  }

  console.log("Traffic Light VAO is initialized:", trafficLightVao);  // Debugging log

  gl.bindVertexArray(trafficLightVao);

  for (const trafficLight of trafficLights) {
    const cube_trans = twgl.v3.create(...trafficLight.position);
    const cube_scale = twgl.v3.create(...trafficLight.scale);

    trafficLight.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
    trafficLight.matrix = twgl.m4.rotateX(trafficLight.matrix, trafficLight.rotation[0]);
    trafficLight.matrix = twgl.m4.rotateY(trafficLight.matrix, trafficLight.rotation[1]);
    trafficLight.matrix = twgl.m4.rotateZ(trafficLight.matrix, trafficLight.rotation[2]);
    trafficLight.matrix = twgl.m4.scale(trafficLight.matrix, cube_scale);

    const newColorData = [];
    for (let i = 0; i < trafficLightBufferInfo.numElements; i++) {
      newColorData.push(...trafficLight.color); // Use the new traffic light color
    }

    twgl.setAttribInfoBufferFromArray(
      gl,
      trafficLightBufferInfo.attribs.a_color,
      newColorData
    );

    const uniforms = {
      u_matrix: trafficLight.matrix,
      u_color: [1.0, 0.0, 0.0, 1.0], // Red
      u_useUniformColor: true
    };

    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, trafficLightBufferInfo);
  }
}

/*
 * Sets up the world view by creating the view-projection matrix.
 * 
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @returns {Float32Array} The view-projection matrix.
 */
function setupWorldView(gl) {
    // Set the field of view (FOV) in radians
    const fov = 45 * Math.PI / 180;

    // Calculate the aspect ratio of the canvas
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Create the projection matrix
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);

    // Set the target position
    const target = [0, 0, 0];

    // Set the up vector
    const up = [0, 1, 0];

    // Calculate the camera position
    const camPos = twgl.v3.create(cameraPosition.x + data.width/2, cameraPosition.y, cameraPosition.z+data.height/2)

    // Create the camera matrix
    const cameraMatrix = twgl.m4.lookAt(camPos, target, up);

    // Calculate the view matrix
    const viewMatrix = twgl.m4.inverse(cameraMatrix);

    // Calculate the view-projection matrix
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

    // Return the view-projection matrix
    return viewProjectionMatrix;
}

/*
 * Sets up the user interface (UI) for the camera position.
 */
function setupUI() {
    // Create a new GUI instance
    const gui = new GUI();

    // Create a folder for the camera position
    const posFolder = gui.addFolder('Position:')

    // Add a slider for the x-axis
    posFolder.add(cameraPosition, 'x', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.x = value
        });

    // Add a slider for the y-axis
    posFolder.add( cameraPosition, 'y', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.y = value
        });

    // Add a slider for the z-axis
    posFolder.add( cameraPosition, 'z', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.z = value
        });
}

function generateData(size) {
    let arrays =
    {
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
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                  // Back Face
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  // Top Face
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  // Bottom Face
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  // Right Face
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  // Left Face
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
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

function generateDataD(size) {
  let arrays =
  {
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
                  0, 1, 0, 1, // v_1
                  0, 1, 0, 1, // v_1
                  0, 1, 0, 1, // v_1
                  0, 1, 0, 1, // v_1
                // Back Face
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                // Top Face
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                // Bottom Face
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                // Right Face
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                // Left Face
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
                0, 1, 0, 1, // v_1
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


function generateObstacleData(size){

    let arrays =
    {
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
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                  // Back Face
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                  // Top Face
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                  // Bottom Face
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                  // Right Face
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                  // Left Face
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
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

main()