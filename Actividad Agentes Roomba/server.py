# server.py
from model import RandomModel
from mesa.visualization import CanvasGrid, BarChartModule
from mesa.visualization import ModularServer
from agent import ObstacleAgent, TrashAgent

def agent_portrayal(agent):
    if agent is None: return
    
    portrayal = {"Shape": "circle",
                 "Filled": "true",
                 "Layer": 0,
                 "Color": "red",
                 "r": 0.5}

    if isinstance(agent, ObstacleAgent):
        portrayal["Color"] = "grey"
        portrayal["Layer"] = 1
        portrayal["r"] = 0.2

    elif isinstance(agent, TrashAgent):
        portrayal ["Shape"] = "rect"
        portrayal["Color"] = "green"
        portrayal["Layer"] = 0.5
        portrayal["w"] = 0.3
        portrayal["h"] = 0.3
    return portrayal

model_params = {"N":5, "width":10, "height":10, "num_obstacles":10, "num_trash":15}

grid = CanvasGrid(agent_portrayal, 10, 10, 500, 500)

bar_chart = BarChartModule(
    [{"Label":"Steps", "Color":"#AA0000"}], 
    scope="agent", sorting="ascending", sort_by="Steps")

server = ModularServer(RandomModel, [grid, bar_chart], "Random Agents", model_params)
                           
server.port = 8521
server.launch()
