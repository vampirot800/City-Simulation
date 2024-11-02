# Ramiro Flores Villarreal
# Actividad Automata Celular
# A01710879

from mesa import Model
from mesa.space import SingleGrid
from mesa.time import SimultaneousActivation
from mesa.datacollection import DataCollector

from agent import Cell

class CellularAutomaton(Model):
    """
    Modelo de Autómata Celular donde todas las celdas se inicializan aleatoriamente.
    """

    def __init__(self, width=50, height=50, density=0.1):
        self.grid = SingleGrid(width, height, torus=False)
        self.schedule = SimultaneousActivation(self)
        self.running = True
        self.density = density  # Probabilidad de que una celda inicie en 'Alive'
        self.datacollector = DataCollector(
            {"Alive": lambda m: self.count_state(m, 'Alive'),
             "Dead": lambda m: self.count_state(m, 'Dead')}
        )

        # Crear agentes y colocarlos en la cuadrícula
        for (contents, pos) in self.grid.coord_iter():
            x, y = pos
            # Inicializar todas las celdas basándose en la densidad
            if self.random.random() < self.density:
                initial_state = 'Alive'
            else:
                initial_state = 'Dead'
            cell = Cell((x, y), self, initial_state)
            self.grid.place_agent(cell, (x, y))
            self.schedule.add(cell)

    def step(self):
        """
        Avanza el modelo un paso.
        """
        self.schedule.step()
        self.datacollector.collect(self)

    @staticmethod
    def count_state(model, state):
        """
        Cuenta el número de celdas en un estado dado.
        """
        count = sum(1 for agent in model.schedule.agents if agent.state == state)
        return count
