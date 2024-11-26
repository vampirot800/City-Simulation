# server.py
from mesa.visualization.ModularVisualization import ModularServer
from mesa.visualization.ModularVisualization import VisualizationElement
from model import CityModel
from agent import *
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='public')
CORS(app)

# Agent portrayal function
def agent_portrayal(agent):
    portrayal = {
        'id': agent.unique_id,
        'Model': agent.model_type,
        'Position': [agent.pos[0], agent.pos[1]],
        'Rotation': agent.rotation,
        'Scale': agent.scale,
    }

    if isinstance(agent, Car):
        portrayal['Color'] = [1, 0, 0, 1]
    elif isinstance(agent, Traffic_Light):
        portrayal['Color'] = [0, 1, 0, 1] if agent.state else [1, 0, 0, 1]
    elif isinstance(agent, Destination):
        portrayal['Color'] = [0, 1, 1, 1]
    elif isinstance(agent, Obstacle):
        portrayal['Color'] = [0.3, 0.3, 0.3, 1]
    elif isinstance(agent, Road):
        portrayal['Color'] = [0.5, 0.5, 0.5, 1]
    else:
        portrayal['Color'] = [1, 1, 1, 1]

    return portrayal

class WebGLVisualization:
    def render(self, model):
        grid_state = []
        for (contents, x, y) in model.grid.coord_iter():
            for agent in contents:
                portrayal = agent_portrayal(agent)
                if portrayal:
                    grid_state.append(portrayal)
        return grid_state

# Create an instance of your model
model_instance = CityModel(N=5)
webgl_vis = WebGLVisualization()

# Route to serve the index.html
@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

# Route to serve other static files (JS, CSS)
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('public', path)

# Endpoint to get agent data
@app.route('/get_agents')
def get_agents():
    # Advance the model by one step
    model_instance.step()
    model_state = webgl_vis.render(model_instance)
    return jsonify(model_state)

if __name__ == '__main__':
    app.run(port=8521)
