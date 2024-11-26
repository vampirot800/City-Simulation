# model.py
from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import *
import json

class CityModel(Model):
    """ 
    Model representing the city with traffic agents.
    """
    def __init__(self, N):
        # Load the map dictionary
        dataDictionary = json.load(open("../city_files/map_dictionary.json"))

        self.traffic_lights = []
        self.destinations = []
        self.roads = []
        self.cars = []

        # Load the map file
        with open('../city_files/map.txt') as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0].strip('\n'))
            self.height = len(lines)

            self.grid = MultiGrid(self.width, self.height, torus=False)
            self.schedule = RandomActivation(self)

            # Create agents based on the map file
            for r, row in enumerate(lines):
                for c, col in enumerate(row.strip('\n')):
                    if col in ["v", "^", ">", "<"]:
                        agent = Road(f"r_{r*self.width+c}", self, dataDictionary[col])
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.roads.append(agent)

                    elif col in ["S", "s"]:
                        agent = Traffic_Light(f"tl_{r*self.width+c}", self, False if col == "S" else True, int(dataDictionary[col]))
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.schedule.add(agent)
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col == "D":
                        agent = Destination(f"d_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.destinations.append(agent)

        self.num_agents = N
        self.running = True

        # Add cars to random road positions
        for i in range(self.num_agents):
            a = Car(f"car_{i}", self)
            road_cells = [agent.pos for agent in self.roads if self.grid.is_cell_empty(agent.pos)]
            if road_cells:
                start_pos = self.random.choice(road_cells)
                self.grid.place_agent(a, start_pos)
                self.schedule.add(a)
                self.cars.append(a)

    def step(self):
        '''Advance the model by one step.'''
        self.schedule.step()
