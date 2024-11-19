
# Ramiro Flores Villarreal
# Actividad ROOMBA
# Simulacion 1
# A01710879

from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from mesa import DataCollector
from agentS1 import RandomAgent, ObstacleAgent, TrashAgent, ChargingStationAgent

def count_trash_agents(model):
    return sum(1 for agent in model.schedule.agents if isinstance(agent, TrashAgent))

def percentage_cleaned(model):
    total_trash = model.initial_trash_count
    trash_remaining = count_trash_agents(model)
    trash_cleaned = total_trash - trash_remaining
    percentage = (trash_cleaned / total_trash) * 100 if total_trash > 0 else 100
    return percentage

class RandomModel(Model):
    def __init__(self, N=1, width=10, height=10, num_obstacles=10, num_trash=15, charging_station_pos=(1,1)):
        super().__init__()
        self.num_agents = 1  
        self.num_obstacles = num_obstacles
        self.num_trash = num_trash
        self.initial_trash_count = num_trash  
        self.grid = MultiGrid(width, height, torus=False)
        self.schedule = RandomActivation(self)
        self.running = True
        self.charging_stations_positions = []

        # Estacion de carga (1,1)
        charging_station = ChargingStationAgent(self.next_id(), self)
        self.grid.place_agent(charging_station, charging_station_pos)
        self.schedule.add(charging_station)
        self.charging_stations_positions.append(charging_station_pos)

        # 1 Roomba en (1,1)
        roomba = RandomAgent(self.next_id(), self)
        self.schedule.add(roomba)
        self.grid.place_agent(roomba, charging_station_pos)
        self.roomba_agent = roomba  


        pos_gen = lambda w, h: (self.random.randrange(w), self.random.randrange(h))

        # Obstaculos Random
        for _ in range(self.num_obstacles):
            pos = pos_gen(self.grid.width, self.grid.height)
            while not self.grid.is_cell_empty(pos) or pos == charging_station_pos:
                pos = pos_gen(self.grid.width, self.grid.height)
            obstacle = ObstacleAgent(self.next_id(), self)
            self.grid.place_agent(obstacle, pos)
            self.schedule.add(obstacle)

        # Basura Random
        for _ in range(self.num_trash):
            pos = pos_gen(self.grid.width, self.grid.height)
            while not self.grid.is_cell_empty(pos) or pos == charging_station_pos:
                pos = pos_gen(self.grid.width, self.grid.height)
            trash = TrashAgent(self.next_id(), self)
            self.grid.place_agent(trash, pos)
            self.schedule.add(trash)

        # Stats
        self.datacollector = DataCollector(
            model_reporters={
                "Time": lambda m: m.schedule.time,
                "PercentageCleaned": percentage_cleaned,
                "BatteryLevel": lambda m: m.roomba_agent.battery,
                "TotalSteps": lambda m: m.roomba_agent.steps_taken,
            },
            agent_reporters={
                "Steps": lambda a: a.steps_taken if isinstance(a, RandomAgent) else 0,
                "Battery": lambda a: a.battery if isinstance(a, RandomAgent) else None
            }
        )

        self.datacollector.collect(self)

    def step(self):
        self.schedule.step()
        self.datacollector.collect(self)
        
        # Acabar simulación sin basura
        if count_trash_agents(self) == 0:
            self.running = False
