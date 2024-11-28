
from agent import *  # Import all agent classes from agent module
from model import CityModel  # Import the CityModel class
from mesa.visualization import CanvasGrid  # CanvasGrid for visualization
from mesa.visualization.ModularVisualization import ModularServer  # ModularServer to run the server
from mesa.visualization import ChartModule  # ChartModule for plotting data


def agent_portrayal(agent):
    """
    Determines how agents are visualized in the simulation.
    Args:
        agent: The agent to be visualized.
    Returns:
        A dictionary defining the portrayal of the agent.
    """
    if agent is None:
        return

    portrayal = {"Shape": "rect", "Filled": "true", "Layer": 1, "w": 1, "h": 1}

    if isinstance(agent, Road):
        portrayal["Color"] = "grey"
        portrayal["Layer"] = 0

    elif isinstance(agent, Destination):
        portrayal["Color"] = "lightgreen"
        portrayal["Layer"] = 0

    elif isinstance(agent, TrafficLight):
        if agent.state == "red":
            portrayal["Color"] = "red"
        elif agent.state == "green":
            portrayal["Color"] = "green"
        portrayal["Layer"] = 0
        portrayal["w"] = 0.8
        portrayal["h"] = 0.8

    elif isinstance(agent, Obstacle):
        portrayal["Color"] = "cadetblue"
        portrayal["Layer"] = 0
        portrayal["w"] = 0.8
        portrayal["h"] = 0.8

    elif isinstance(agent, Car):
        portrayal["Color"] = "black"  # Only Car A is represented
        portrayal["Shape"] = "circle"
        portrayal["Layer"] = 1
        portrayal["r"] = 0.5

    return portrayal

# Load the map file to determine grid size and content
map_file_path = "../city_files/map.txt"
with open(map_file_path) as baseFile:
    lines = baseFile.readlines()
    width = len(lines[0].strip())  # Calculate the width of the grid
    height = len(lines)  # Calculate the height of the grid

# Define model parameters
model_params = {
    "width": width,
    "height": height,
    "lines": lines,
    "steps_dist_max": 100,
}

# Configure visualization grid
grid = CanvasGrid(agent_portrayal, width, height, 500, 500)

# Configure chart to show the number of active cars
chart_active_cars = ChartModule(
    [{"Label": "ActiveCars", "Color": "blue"}],
    data_collector_name='datacollector',
)

# Configure chart to show the number of cars that reached their destination
chart_cars_reached = ChartModule(
    [{"Label": "CarsReachedDestination", "Color": "green"}],
    data_collector_name='datacollector',
)

# Include charts in the server
server = ModularServer(
    CityModel,
    [grid, chart_active_cars, chart_cars_reached],
    "Traffic Simulation",
    model_params,
)

server.port = 8521  # Set server port
server.launch()  # Launch the server