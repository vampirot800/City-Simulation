# server.py
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS, cross_origin
from model import RandomModel
from agent import Obstacle, Road, Traffic_Light, Car, Destination
import os

# Initialize global variables
randomModel = None
currentStep = 0

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, origins=['http://localhost'])

# Optional: Route to serve index.html
@app.route('/')
def index():
    return render_template('index.html')

# Route to initialize the model
@app.route('/init', methods=['POST'])
@cross_origin()
def initModel():
    global currentStep, randomModel

    if request.method == 'POST':
        try:
            # Optional: Parse JSON data if needed
            data = request.get_json()
            # You can use 'data' to customize model initialization if required

            currentStep = 0
            randomModel = RandomModel()
            print("Model initialized successfully from map file.")
            return jsonify({"message": "Model initialized from map file."}), 200
        except Exception as e:
            print(f"Error during initialization: {e}")
            return jsonify({"message": f"Error initializing the model: {e}"}), 500

# Route to get streets
@app.route('/getStreets', methods=['GET'])
@cross_origin()
def getStreets():
    global randomModel

    if request.method == 'GET':
        if randomModel is None:
            return jsonify({"message": "Model not initialized."}), 400
        try:
            streetPositions = [
                {"id": str(a.unique_id), "x": x, "y": -4, "z": z}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Road)
            ]
            return jsonify({'positions': streetPositions}), 200
        except Exception as e:
            print(f"Error in /getStreets: {e}")
            return jsonify({"message": f"Error with street positions: {e}"}), 500

# Route to get buildings
@app.route('/getBuildings', methods=['GET'])
@cross_origin()
def getBuildings():
    global randomModel

    if request.method == 'GET':
        if randomModel is None:
            return jsonify({"message": "Model not initialized."}), 400
        try:
            buildingPositions = [
                {"id": str(a.unique_id), "x": x, "y": 1, "z": z}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Obstacle)
            ]
            return jsonify({'positions': buildingPositions}), 200
        except Exception as e:
            print(f"Error in /getBuildings: {e}")
            return jsonify({"message": f"Error with building positions: {e}"}), 500

# Route to get destinations
@app.route('/getDestinations', methods=['GET'])
@cross_origin()
def getDestinations():
    global randomModel

    if request.method == 'GET':
        if randomModel is None:
            return jsonify({"message": "Model not initialized."}), 400
        try:
            destinationPositions = [
                {"id": str(a.unique_id), "x": x, "y": 1, "z": z}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Destination)
            ]
            return jsonify({'positions': destinationPositions}), 200
        except Exception as e:
            print(f"Error in /getDestinations: {e}")
            return jsonify({"message": f"Error with destination positions: {e}"}), 500

# Route to get traffic lights
@app.route('/getTrafficLights', methods=['GET'])
@cross_origin()
def getTrafficLights():
    global randomModel

    if request.method == 'GET':
        if randomModel is None:
            return jsonify({"message": "Model not initialized."}), 400
        try:
            trafficLightPositions = [
                {"id": str(a.unique_id), "x": x, "y": 1, "z": z}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Traffic_Light)
            ]
            return jsonify({'positions': trafficLightPositions}), 200
        except Exception as e:
            print(f"Error in /getTrafficLights: {e}")
            return jsonify({"message": f"Error with traffic light positions: {e}"}), 500

# Route to get cars
@app.route('/getCars', methods=['GET'])
@cross_origin()
def getCars():
    global randomModel

    if request.method == 'GET':
        if randomModel is None:
            return jsonify({"message": "Model not initialized."}), 400
        try:
            carPositions = [
                {"id": str(a.unique_id), "x": x, "y": -4, "z": z}
                for (contents, (x, z)) in randomModel.grid.coord_iter()
                for a in contents
                if isinstance(a, Car)
            ]
            return jsonify({'positions': carPositions}), 200
        except Exception as e:
            print(f"Error in /getCars: {e}")
            return jsonify({"message": f"Error with car positions: {e}"}), 500

# Route to update the model
@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    global currentStep, randomModel
    if request.method == 'GET':
        if randomModel is None:
            return jsonify({"message": "Model not initialized."}), 400
        try:
            randomModel.step()
            currentStep += 1
            return jsonify({'message': f'Model updated to step {currentStep}.', 'currentStep': currentStep}), 200
        except Exception as e:
            print(f"Error during /update: {e}")
            return jsonify({"message": f"Error during update: {e}"}), 500

if __name__ == '__main__':
    # Run the Flask server on port 5175
    app.run(host="localhost", port=5175, debug=True)
