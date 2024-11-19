
# Ramiro Flores Villarreal
# Actividad Automata Celular
# A01710879

from mesa.visualization.modules import CanvasGrid
from mesa.visualization.ModularVisualization import ModularServer
from mesa.visualization.modules import ChartModule


from model import CellularAutomaton

def portray_cell(cell):
    if cell is None:
        return
    portrayal = {"Shape": "rect", "w": 1, "h": 1, "Filled": "true", "Layer": 0}
    (x, y) = cell.pos
    portrayal["x"] = x
    portrayal["y"] = y
    if cell.state == 'Alive':
        portrayal["Color"] = "black"
    else:
        portrayal["Color"] = "white"
    return portrayal

# Create a grid visualization
grid_width = 50
grid_height = 50
canvas_element = CanvasGrid(portray_cell, grid_width, grid_height, 500, 500)

# Create a chart to display the counts of 'Alive' and 'Dead' cells
chart_element = ChartModule(
    [{"Label": "Alive", "Color": "Black"},
     {"Label": "Dead", "Color": "Gray"}]
)

model_params = {
    "width": grid_width,
    "height": grid_height
}

server = ModularServer(
    CellularAutomaton, [canvas_element, chart_element], "Cellular Automaton", model_params
)

if __name__ == "__main__":
    server.launch()
