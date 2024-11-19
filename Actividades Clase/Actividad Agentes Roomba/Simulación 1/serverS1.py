
# Ramiro Flores Villarreal
# Actividad ROOMBA
# Simulacion 1
# A01710879

from modelS1 import RandomModel, percentage_cleaned
from mesa.visualization import CanvasGrid, ModularServer, ChartModule, TextElement
from agentS1 import ObstacleAgent, TrashAgent, ChargingStationAgent, RandomAgent

def agent_portrayal(agent):
    if agent is None:
        return

    if isinstance(agent, RandomAgent):
        portrayal = {
            "Shape": "circle",
            "Color": "red",
            "Filled": "true",
            "Layer": 2,
            "r": 0.5,
            "text": f"{agent.battery}%",
            "text_color": "black"
        }
    elif isinstance(agent, ChargingStationAgent):
        portrayal = {
            "Shape": "rect",
            "Color": "blue",
            "Filled": "true",
            "Layer": 1,
            "w": 1,
            "h": 1
        }
    elif isinstance(agent, TrashAgent):
        portrayal = {
            "Shape": "rect",
            "Color": "green",
            "Filled": "true",
            "Layer": 0.5,
            "w": 0.3,
            "h": 0.3
        }
    elif isinstance(agent, ObstacleAgent):
        portrayal = {
            "Shape": "circle",
            "Color": "grey",
            "Filled": "true",
            "Layer": 0,
            "r": 0.3
        }
    else:
        portrayal = {}

    return portrayal

model_params = {
    "N": 1,
    "width": 10,
    "height": 10,
    "num_obstacles": 10,
    "num_trash": 15,
    "charging_station_pos": (1, 1)
}

grid = CanvasGrid(agent_portrayal, model_params["width"], model_params["height"], 500, 500)

# Grafica
stats_chart = ChartModule(
    [
        {"Label": "BatteryLevel", "Color": "Red"},
        {"Label": "PercentageCleaned", "Color": "Green"},
        {"Label": "TotalSteps", "Color": "Blue"}
    ],
    data_collector_name='datacollector'
)

# Display de Stats
class SimulationStatus(TextElement):
    def __init__(self):
        pass

    def render(self, model):
        total_time = model.schedule.time
        percentage = percentage_cleaned(model)
        total_steps = model.roomba_agent.steps_taken
        return "Time: {}<br>Percentage cleaned: {:.2f}%<br>Total steps: {}".format(
            total_time, percentage, total_steps)

server = ModularServer(
    RandomModel,
    [grid, stats_chart, SimulationStatus()],
    "Roomba Simulation",
    model_params
)

server.port = 8521
server.launch()
