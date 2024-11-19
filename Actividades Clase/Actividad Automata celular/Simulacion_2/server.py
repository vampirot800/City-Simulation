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
    # Invertir la coordenada y para visualizar correctamente
    portrayal["y"] = (cell.model.grid.height - 1) - y
    if cell.state == 'Alive':
        portrayal["Color"] = "black"
    else:
        portrayal["Color"] = "white"
    return portrayal

# Crear una visualización de la cuadrícula
grid_width = 50
grid_height = 50
canvas_element = CanvasGrid(portray_cell, grid_width, grid_height, 500, 500)

# Crear un gráfico para mostrar los conteos de celdas 'Alive' y 'Dead'
chart_element = ChartModule(
    [{"Label": "Alive", "Color": "Black"},
     {"Label": "Dead", "Color": "Gray"}]
)

model_params = {
    "width": grid_width,
    "height": grid_height,
    "density": 0.5  # Puedes ajustar la densidad aquí
}

server = ModularServer(
    CellularAutomaton, [canvas_element, chart_element], "Cellular Automaton", model_params
)

if __name__ == "__main__":
    server.launch()
