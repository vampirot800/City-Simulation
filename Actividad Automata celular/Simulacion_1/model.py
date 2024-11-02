
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
    Cellular Automaton model that generates a Sierpinski triangle pattern.
    """

    def __init__(self, width=50, height=50, density=0.1):
        self.grid = SingleGrid(width, height, torus=False)
        self.schedule = SimultaneousActivation(self)
        self.running = True
        self.density = density  # Agregamos el parámetro de densidad
        self.datacollector = DataCollector(
            {"Alive": lambda m: self.count_state(m, 'Alive'),
             "Dead": lambda m: self.count_state(m, 'Dead')}
        )

        # Create agents and place them on the grid
        for (contents, pos) in self.grid.coord_iter():
            x, y = pos
            if y == height - 1:
                # Initialize the top row based on the density
                if self.random.random() < self.density:
                    initial_state = 'Alive'
                else:
                    initial_state = 'Dead'
            else:
                initial_state = 'Dead'
            cell = Cell((x, y), self, initial_state)
            self.grid.place_agent(cell, (x, y))
            self.schedule.add(cell)

    def step(self):
        """
        Advance the model by one step.
        """
        self.schedule.step()
        self.datacollector.collect(self)

    @staticmethod
    def count_state(model, state):
        """
        Count the number of cells in a given state.
        """
        count = sum(1 for agent in model.schedule.agents if agent.state == state)
        return count

