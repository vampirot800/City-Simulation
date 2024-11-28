# servidor_flask.py

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from model import CityModel
from agent import Road, Obstacle, Car, Destination, TrafficLight
import json

# Variables globales
city_model = None
current_step = 0

# Flask app
app = Flask("TrafficSimulation")
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/init', methods=['POST'])
@cross_origin()
def init_model():
    global city_model, current_step
    try:
        data = request.json
        map_file_path = data.get('map_file', '../city_files/map.txt')
        steps_dist_max = data.get('steps_dist_max', 100)
        
        # Leer el archivo de mapa
        with open(map_file_path, 'r') as file:
            lines = [line.strip() for line in file.readlines()]
        
        width = len(lines[0])
        height = len(lines)
        
        # Inicializar el modelo
        city_model = CityModel(width=width, height=height, lines=lines, steps_dist_max=steps_dist_max)
        current_step = 0
        
        return jsonify({"message": "Modelo inicializado exitosamente.", "width": width, "height": height}), 200
    except Exception as e:
        print(f"Error durante la inicialización: {e}")
        return jsonify({"message": "Error al inicializar el modelo", "error": str(e)}), 500

@app.route('/update', methods=['GET'])
@cross_origin()
def update_model():
    global city_model, current_step
    try:
        if city_model is None:
            return jsonify({"message": "Modelo no inicializado."}), 400
        
        city_model.step()
        current_step += 1
        
        return jsonify({"message": f"Modelo actualizado al paso {current_step}.", "current_step": current_step}), 200
    except Exception as e:
        print(f"Error durante la actualización del modelo: {e}")
        return jsonify({"message": "Error al actualizar el modelo", "error": str(e)}), 500

@app.route('/getStreets', methods=['GET'])
@cross_origin()
def get_streets():
    global city_model
    try:
        streets = []
        for agent in city_model.schedule.agents:
            if isinstance(agent, Road):
                x, y = agent.pos
                streets.append({"id": agent.unique_id, "x": x, "z": y})


                
        return jsonify({'streets': streets}), 200
    except Exception as e:
        print(f"Error al obtener calles: {e}")
        return jsonify({"message": "Error al obtener calles", "error": str(e)}), 500

@app.route('/getBuildings', methods=['GET'])
@cross_origin()
def get_buildings():
    global city_model
    try:
        # buildings = []
        # for agent in city_model.schedule.agents:
        #     if isinstance(agent, Obstacle):
        #         x, y = agent.pos
        #         buildings.append({"id": agent.unique_id, "x": x, "z": y})
        obstacles = [
                {"id": str(b.unique_id),"x": x, "y": 1, "z": z}
                for a, (x,z) in city_model.grid.coord_iter()
                for b in a
                if isinstance(b, Obstacle)]

        print (obstacles)

        return jsonify({'buildings': obstacles}), 200
    except Exception as e:
        print(f"Error al obtener edificios: {e}")
        return jsonify({"message": "Error al obtener edificios", "error": str(e)}), 500

@app.route('/getDestinations', methods=['GET'])
@cross_origin()
def get_destinations():
    global city_model
    try:
        # destinations = []
        # for agent in city_model.schedule.agents:
        #     print (type (agent))
        #     if isinstance(agent, Destination):
        #         x, y = agent.pos
        #         destinations.append({"id": agent.unique_id, "x": x, "z": y})

        destinations = [
                {"id": str(b.unique_id),"x": x, "y": 1, "z": z}
                for a, (x,z) in city_model.grid.coord_iter()
                for b in a
                if isinstance(b, Destination)]

        print (destinations)

        return jsonify({'destinations': destinations}), 200
    except Exception as e:
        print(f"Error al obtener destinos: {e}")
        return jsonify({"message": "Error al obtener destinos", "error": str(e)}), 500

@app.route('/getTrafficLights', methods=['GET'])
@cross_origin()
def get_traffic_lights():
    global city_model
    try:
        traffic_lights = []
        for agent in city_model.schedule.agents:
            if isinstance(agent, TrafficLight):
                x, y = agent.pos
                color = "green" if agent.state == "green" else "red"
                traffic_lights.append({
                    "id": agent.unique_id,
                    "x": x,
                    "z": y,
                    "color": color
                })
        return jsonify({'traffic_lights': traffic_lights}), 200
    except Exception as e:
        print(f"Error al obtener semáforos: {e}")
        return jsonify({"message": "Error al obtener semáforos", "error": str(e)}), 500

@app.route('/getCars', methods=['GET'])
@cross_origin()
def get_cars():
    global city_model
    try:
        cars = []
        for agent in city_model.schedule.agents:
            if isinstance(agent, Car):
                x, y = agent.pos
                cars.append({
                    "id": agent.unique_id,
                    "x": x,
                    "z": y,
                    "destination": agent.destination,
                    "route_index": agent.route_index,
                    "steps_taken": agent.steps_taken
                })
        return jsonify({'cars': cars}), 200
    except Exception as e:
        print(f"Error al obtener coches: {e}")
        return jsonify({"message": "Error al obtener coches", "error": str(e)}), 500

@app.route('/getGraphConnections', methods=['GET'])
@cross_origin()
def get_graph_connections():
    global city_model
    try:
        return jsonify({'graph': city_model.graph}), 200
    except Exception as e:
        print(f"Error al obtener conexiones del grafo: {e}")
        return jsonify({"message": "Error al obtener conexiones del grafo", "error": str(e)}), 500

if __name__ == '__main__':
    # Ejecutar el servidor Flask en el puerto 8585
    app.run(host="0.0.0.0", port=8585, debug=True)
