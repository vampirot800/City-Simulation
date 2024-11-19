// TAREA CG1 
// Ramiro Flores Villarreal
// A01710879

const readline = require('readline');
const fs = require('fs');

// Función para calcular el vector normal de una cara
function computeFaceNormal(v0Index, v1Index, v2Index, vertices) {
    // Ajustar los índices (OBJ comienza en 1, pero arrays en JavaScript comienzan en 0)
    const v0 = vertices[v0Index - 1];
    const v1 = vertices[v1Index - 1];
    const v2 = vertices[v2Index - 1];

    // Vectores U y V
    const U = [
        v1[0] - v0[0],
        v1[1] - v0[1],
        v1[2] - v0[2],
    ];
    const V = [
        v2[0] - v0[0],
        v2[1] - v0[1],
        v2[2] - v0[2],
    ];

    // Producto cruz para obtener la normal
    const nx = U[1] * V[2] - U[2] * V[1];
    const ny = U[2] * V[0] - U[0] * V[2];
    const nz = U[0] * V[1] - U[1] * V[0];

    // Normalizar el vector normal
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

    // Evitar división por cero
    if (length === 0) {
        return [0, 0, 0];
    }

    return [nx / length, ny / length, nz / length];
}

// Función para generar el archivo OBJ
function generateWheelObj(sides = 8, radius = 1.0, width = 0.5) {
    const vertices = [];
    const faces = [];
    const normals = [];

    // Generar vértices
    for (let i = 0; i < sides; i++) {
        const angle = (2 * Math.PI * i) / sides;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        // Agregar vértices en el frente y atrás del círculo (rueda)
        vertices.push([x, y, width / 2]);  // Frente
        vertices.push([x, y, -width / 2]); // Atrás
    }

    // Añadir vértices centrales
    vertices.push([0, 0, width / 2]);      // Centro frontal
    const frontCenterIndex = vertices.length; // Índice del centro frontal (OBJ)
    vertices.push([0, 0, -width / 2]);     // Centro trasero
    const backCenterIndex = vertices.length;  // Índice del centro trasero (OBJ)

    // Generar caras y normales

    // Caras laterales
    for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;

        const currentFront = 2 * i + 1; // Índices para OBJ (comienzan en 1)
        const currentBack = 2 * i + 2;
        const nextFront = 2 * next + 1;
        const nextBack = 2 * next + 2;

        // Primer triángulo lateral
        faces.push([currentFront, currentBack, nextFront]);
        normals.push(computeFaceNormal(currentFront, currentBack, nextFront, vertices));

        // Segundo triángulo lateral
        faces.push([nextFront, currentBack, nextBack]);
        normals.push(computeFaceNormal(nextFront, currentBack, nextBack, vertices));
    }

    // Caras frontales
    for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        const currentFront = 2 * i + 1;
        const nextFront = 2 * next + 1;

        faces.push([frontCenterIndex, currentFront, nextFront]);
        normals.push([0, 0, 1]); // Normal hacia adelante
    }

    // Caras traseras
    for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        const currentBack = 2 * i + 2;
        const nextBack = 2 * next + 2;

        faces.push([backCenterIndex, nextBack, currentBack]);
        normals.push([0, 0, -1]); // Normal hacia atrás
    }

    // Ensamblar el archivo OBJ
    let objData = '';
    vertices.forEach(v => {
        objData += `v ${v[0]} ${v[1]} ${v[2]}\n`;
    });
    normals.forEach(n => {
        objData += `vn ${n[0]} ${n[1]} ${n[2]}\n`;
    });
    faces.forEach((f, i) => {
        const normalIndex = i + 1; // Los índices de normales empiezan en 1
        objData += `f ${f[0]}//${normalIndex} ${f[1]}//${normalIndex} ${f[2]}//${normalIndex}\n`;
    });

    return objData;
}

// Funciones para solicitar entrada al usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askSides(callback) {
    rl.question('Número de lados del círculo (entero entre 3 y 360) [8]: ', (answer) => {
        let sides = parseInt(answer, 10);
        if (isNaN(sides) || sides < 3 || sides > 360) {
            sides = 8;
        }
        callback(sides);
    });
}

function askRadius(sides, callback) {
    rl.question('Radio del círculo (flotante positivo) [1.0]: ', (answer) => {
        let radius = parseFloat(answer);
        if (isNaN(radius) || radius <= 0) {
            radius = 1.0;
        }
        callback(sides, radius);
    });
}

function askWidth(sides, radius, callback) {
    rl.question('Ancho de la rueda (flotante positivo) [0.5]: ', (answer) => {
        let width = parseFloat(answer);
        if (isNaN(width) || width <= 0) {
            width = 0.5;
        }
        callback(sides, radius, width);
    });
}

// Solicitar entradas al usuario y generar el archivo OBJ
askSides((sides) => {
    askRadius(sides, (sides, radius) => {
        askWidth(sides, radius, (sides, radius, width) => {
            rl.close();

            const objData = generateWheelObj(sides, radius, width);

            // Guardar en un archivo
            fs.writeFileSync('wheel.obj', objData);
            console.log('Archivo wheel.obj generado.');
        });
    });
});
