// src/webgl_visualization.js
'use strict';

// Import required modules
import * as twgl from 'twgl.js';  // Ensure twgl.js is installed via npm

// Export the WebGLModule class
export class WebGLModule {
  constructor(canvas_width, canvas_height) {
    // Create a canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.width = canvas_width;
    this.canvas.height = canvas_height;
    document.getElementById('elements').appendChild(this.canvas);

    // Get the WebGL rendering context
    this.gl = this.canvas.getContext('webgl2');

    // Initialize variables
    this.programInfo = null;
    this.objects = {};
    this.then = 0;

    // Initialize WebGL
    this.initWebGL();

    // Start rendering loop
    requestAnimationFrame(this.render.bind(this));
  }

  initWebGL() {
    const gl = this.gl;

    // Vertex shader source
    const vsSource = `#version 300 es
    in vec4 a_position;
    in vec4 a_color;
    uniform mat4 u_matrix;
    out vec4 v_color;
    void main() {
      gl_Position = u_matrix * a_position;
      v_color = a_color;
    }`;

    // Fragment shader source
    const fsSource = `#version 300 es
    precision highp float;
    in vec4 v_color;
    out vec4 outColor;
    void main() {
      outColor = v_color;
    }`;

    // Create program info
    this.programInfo = twgl.createProgramInfo(gl, [vsSource, fsSource]);

    // Enable depth and cull face
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  render(time) {
    const gl = this.gl;
    time *= 0.001; // Convert to seconds
    const deltaTime = time - this.then;
    this.then = time;

    // Resize canvas
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear canvas
    gl.clearColor(0.5, 0.5, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use the program
    gl.useProgram(this.programInfo.program);

    // Set up camera
    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = twgl.m4.perspective(fieldOfViewRadians, aspect, 0.1, 100);
    const cameraPosition = [0, 20, 40];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraMatrix = twgl.m4.lookAt(cameraPosition, target, up);
    const viewMatrix = twgl.m4.inverse(cameraMatrix);
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

    // Draw each object
    Object.values(this.objects).forEach((obj) => {
      let modelMatrix = twgl.m4.identity();
      modelMatrix = twgl.m4.translate(modelMatrix, [obj.position[0], 0, obj.position[1]]);
      modelMatrix = twgl.m4.yRotate(modelMatrix, degToRad(obj.rotation));
      modelMatrix = twgl.m4.scale(modelMatrix, [obj.scale[0], obj.scale[1], obj.scale[2]]);
      const mvpMatrix = twgl.m4.multiply(viewProjectionMatrix, modelMatrix);

      twgl.setUniforms(this.programInfo, {
        u_matrix: mvpMatrix,
      });

      gl.bindVertexArray(obj.vao);
      twgl.drawBufferInfo(gl, obj.bufferInfo);
    });

    // Request next frame
    requestAnimationFrame(this.render.bind(this));
  }

  update(data) {
    const gl = this.gl;

    data.forEach((agent) => {
      const id = agent.id || agent.unique_id;

      // Create new object if it doesn't exist
      if (!this.objects[id]) {
        const arrays = this.createGeometryForAgent(agent);
        const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
        const vao = twgl.createVAOFromBufferInfo(gl, this.programInfo, bufferInfo);

        this.objects[id] = {
          bufferInfo: bufferInfo,
          vao: vao,
          position: [agent.Position[0], agent.Position[1]],
          rotation: agent.Rotation || 0,
          scale: agent.Scale || [1, 1, 1],
          modelType: agent.Model,
          color: agent.Color || [1, 1, 1, 1],
        };
      } else {
        // Update existing object's properties
        this.objects[id].position = [agent.Position[0], agent.Position[1]];
        this.objects[id].rotation = agent.Rotation || 0;
        this.objects[id].scale = agent.Scale || [1, 1, 1];
        this.objects[id].color = agent.Color || [1, 1, 1, 1];
      }
    });
  }

  createGeometryForAgent(agent) {
    let arrays;
    switch (agent.Model) {
      case 'car':
        arrays = twgl.primitives.createCubeVertices();
        arrays.color = { numComponents: 4, data: this.createColorArray(agent.Color || [1, 0, 0, 1], arrays.position.numElements) };
        break;
      case 'traffic_light':
        arrays = twgl.primitives.createCylinderVertices(0.2, 1, 12, 1);
        arrays.color = { numComponents: 4, data: this.createColorArray(agent.Color, arrays.position.numElements) };
        break;
      case 'road':
        arrays = twgl.primitives.createPlaneVertices(1, 1, 1, 1);
        arrays.color = { numComponents: 4, data: this.createColorArray([0.5, 0.5, 0.5, 1], arrays.position.numElements) };
        break;
      case 'obstacle':
        arrays = twgl.primitives.createCubeVertices();
        arrays.color = { numComponents: 4, data: this.createColorArray([0.3, 0.3, 0.3, 1], arrays.position.numElements) };
        break;
      case 'destination':
        arrays = twgl.primitives.createSphereVertices(0.2, 12, 6);
        arrays.color = { numComponents: 4, data: this.createColorArray([0, 1, 1, 1], arrays.position.numElements) };
        break;
      default:
        arrays = twgl.primitives.createCubeVertices();
        arrays.color = { numComponents: 4, data: this.createColorArray([1, 1, 1, 1], arrays.position.numElements) };
        break;
    }
    return arrays;
  }

  createColorArray(color, numVertices) {
    const colors = [];
    for (let i = 0; i < numVertices; i++) {
      colors.push(...color);
    }
    return colors;
  }
}

// Utility function to convert degrees to radians
function degToRad(d) {
  return (d * Math.PI) / 180;
}
