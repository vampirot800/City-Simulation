# TC2008B. Sistemas Multiagentes y Gráficas Computacionales
# Python flask server to interact with webGL.
# Octavio Navarro. 2024

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from model import CityModel
from agent import Road, Obstacle, Car, Destination, TrafficLight

# Global variables
randomModel = None
currentStep = 0

# Flask app
app = Flask("Traffic example")
cors = CORS(app, origins=['http://localhost'])

@app.route('/init', methods=['POST'])
@cross_origin()
def initModel():
    """
    Initialize the model with the map configuration.
    """
    global currentStep, randomModel

    if request.method == 'POST':
        try:
            currentStep = 0
            randomModel = CityModel()
            print("Model initialized successfully from map file.")
            return jsonify({"message": "Model initialized from map file."}), 200
        except Exception as e:
            print(f"Error during initialization: {e}")
            return jsonify({"message": "Error initializing the model", "error": str(e)}), 500

@app.route('/getStreets', methods=['GET'])
@cross_origin()
def getStreets():
    """
    Get the positions of street agents.
    """
    global randomModel
    if request.method == 'GET':
        try:
            streetPositions = [
                {"id": str(a.unique_id), "x": x, "y": -4, "z": z}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Road)
            ]
            return jsonify({'positions': streetPositions}), 200
        except Exception as e:
            print(f"Error with street positions: {e}")
            return jsonify({"message": "Error with street positions"}), 500

@app.route('/getBuildings', methods=['GET'])
@cross_origin()
def getBuildings():
    """
    Get the positions of building agents.
    """
    global randomModel
    if request.method == 'GET':
        try:
            buildingPositions = [
                {"id": str(a.unique_id), "x": x, "y": -1.5, "z": z}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Obstacle)
            ]
            return jsonify({'positions': buildingPositions}), 200
        except Exception as e:
            print(f"Error with building positions: {e}")
            return jsonify({"message": "Error with building positions"}), 500

@app.route('/getDestinations', methods=['GET'])
@cross_origin()
def getDestinations():
    """
    Get the positions of destination agents.
    """
    global randomModel
    if request.method == 'GET':
        try:
            destinationPositions = [
                {"id": str(a.unique_id), "x": x, "y": -1, "z": z}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Destination)
            ]
            return jsonify({'positions': destinationPositions}), 200
        except Exception as e:
            print(f"Error with destination positions: {e}")
            return jsonify({"message": "Error with destination positions"}), 500

@app.route('/getTrafficLights', methods=['GET'])
@cross_origin()
def getTrafficLights():
    """
    Get the RGB states of traffic light agents.
    """
    global randomModel
    if request.method == 'GET':
        try:
            trafficLightStates = [
                {
                    "id": str(a.unique_id),
                    "x": x,
                    "y": 0.5,
                    "z": z,
                    "r": a.color[0],  # Red component
                    "g": a.color[1],  # Green component
                    "b": a.color[2],  # Blue component
                    "a": a.color[3]   # Alpha component
                }
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, TrafficLight)
            ]
            return jsonify({'states': trafficLightStates}), 200
        except Exception as e:
            print(f"Error with traffic light RGB states: {e}")
            return jsonify({"message": "Error with traffic light RGB states"}), 500

@app.route('/getCars', methods=['GET'])
@cross_origin()
def getCars():
    """
    Get the positions of car agents.
    """
    global randomModel
    if request.method == 'GET':
        try:
            carPositions = [
                {"id": str(a.unique_id), "x": x, "y": -3, "z": z, "facing": a.facing, "current_x": a.current_pos[0], "current_y": -3,
                "current_z": a.current_pos[1]}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Car)
            ]
            return jsonify({'positions': carPositions}), 200
        except Exception as e:
            print(f"Error with car positions: {e}")
            return jsonify({"message": "Error with car positions"}), 500

@app.route('/getGraphConnections', methods=['GET'])
@cross_origin()
def getGraphConnections():
    """
    Get the graph connections from the model.
    """
    global randomModel
    if request.method == 'GET':
        try:
            return jsonify({'graph': randomModel.graph}), 200
        except Exception as e:
            print(f"Error retrieving graph connections: {e}")
            return jsonify({"message": "Error retrieving graph connections"}), 500

@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    """
    Update the model by one step.
    """
    global currentStep, randomModel
    if request.method == 'GET':
        try:
            randomModel.step()
            currentStep += 1
            return jsonify({'message': f'Model updated to step {currentStep}.', 'currentStep': currentStep}), 200
        except Exception as e:
            print(f"Error during model update: {e}")
            return jsonify({"message": "Error during model update"}), 500

if __name__ == '__main__':
    # Run the Flask server on port 8585
    app.run(host="localhost", port=8585, debug=True)