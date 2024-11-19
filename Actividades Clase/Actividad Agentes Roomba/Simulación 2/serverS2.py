# server.py
# Ramiro Flores Villarreal
# Actividad ROOMBA
# Simulación 2
# A01710879

from modelS2 import RandomModel, percentage_cleaned
from mesa.visualization import CanvasGrid, ModularServer, ChartModule, TextElement
from agentS2 import ObstacleAgent, TrashAgent, ChargingStationAgent, RandomAgent

def agent_portrayal(agent):
    if agent is None:
        return

    if isinstance(agent, RandomAgent):
        colors = ["red", "orange", "purple", "yellow", "pink", "cyan", "brown", "magenta"]
        portrayal = {
            "Shape": "circle",
            "Color": colors[agent.unique_id % len(colors)],  # Asignar color basado en ID
            "Filled": "true",
            "Layer": 2,
            "r": 0.5,
            "text": f"{agent.unique_id}\n{agent.battery}%",
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
    "N": 2,  # Número de agentes
    "width": 10,
    "height": 10,
    "num_obstacles": 10,
    "num_trash": 15
}

grid = CanvasGrid(agent_portrayal, model_params["width"], model_params["height"], 500, 500)

# Gráfica combinada para los tres indicadores
stats_chart = ChartModule(
    [
        {"Label": "AverageBatteryLevel", "Color": "Red"},
        {"Label": "TotalSteps", "Color": "Blue"},
        {"Label": "PercentageCleaned", "Color": "Green"}
    ],
    data_collector_name='datacollector'
)

# Clase para mostrar estadísticas
class SimulationStatus(TextElement):
    def __init__(self):
        pass

    def render(self, model):
        total_time = model.schedule.time
        percentage = percentage_cleaned(model)
        stats = f"<b>Time:</b> {total_time}<br><b>Percentage cleaned:</b> {percentage:.2f}%<br>"
        stats += f"<b>Average Battery Level:</b> {average_battery_level(model):.2f}%<br>"
        stats += f"<b>Total Steps Taken:</b> {total_steps_taken(model)}<br><br>"
        stats += "<b>Agent Details:</b><br>"
        for agent in model.agent_list:
            stats += f"Agent {agent.unique_id} - Steps: {agent.steps_taken}, Battery: {agent.battery}%<br>"
        return stats

# Necesitamos importar las funciones adicionales
from modelS2 import average_battery_level, total_steps_taken

server = ModularServer(
    RandomModel,
    [grid, stats_chart, SimulationStatus()],
    "Roomba Simulation",
    model_params
)

server.port = 8521
server.launch()
