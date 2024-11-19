# model.py
# Ramiro Flores Villarreal
# Actividad ROOMBA
# Simulación 2
# A01710879

from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from mesa import DataCollector
from agentS2 import RandomAgent, ObstacleAgent, TrashAgent, ChargingStationAgent

def count_trash_agents(model):
    return sum(1 for agent in model.schedule.agents if isinstance(agent, TrashAgent))

def percentage_cleaned(model):
    total_trash = model.initial_trash_count
    trash_remaining = count_trash_agents(model)
    trash_cleaned = total_trash - trash_remaining
    percentage = (trash_cleaned / total_trash) * 100 if total_trash > 0 else 100
    return percentage

def average_battery_level(model):
    agents = [agent for agent in model.schedule.agents if isinstance(agent, RandomAgent)]
    if agents:
        avg_battery = sum(agent.battery for agent in agents) / len(agents)
        return avg_battery
    else:
        return 0

def total_steps_taken(model):
    agents = [agent for agent in model.schedule.agents if isinstance(agent, RandomAgent)]
    total_steps = sum(agent.steps_taken for agent in agents)
    return total_steps

class RandomModel(Model):
    def __init__(self, N=2, width=10, height=10, num_obstacles=10, num_trash=15):
        super().__init__()
        self.num_agents = N  # Número de agentes
        self.num_obstacles = num_obstacles
        self.num_trash = num_trash
        self.initial_trash_count = num_trash  # Basura inicial
        self.grid = MultiGrid(width, height, torus=False)
        self.schedule = RandomActivation(self)
        self.running = True
        self.charging_stations_positions = []  # Lista de posiciones de estaciones de carga

        pos_gen = lambda w, h: (self.random.randrange(w), self.random.randrange(h))

        # Crear agentes y sus estaciones de carga
        self.agent_list = []  # Lista de agentes
        for i in range(self.num_agents):
            # Generar posición aleatoria para el agente
            agent_pos = pos_gen(self.grid.width, self.grid.height)
            while not self.grid.is_cell_empty(agent_pos):
                agent_pos = pos_gen(self.grid.width, self.grid.height)

            # Crear estación de carga en la posición del agente
            charging_station = ChargingStationAgent(self.next_id(), self)
            self.grid.place_agent(charging_station, agent_pos)
            self.schedule.add(charging_station)
            self.charging_stations_positions.append(agent_pos)

            # Crear agente en la posición
            roomba = RandomAgent(self.next_id(), self, agent_pos)
            self.schedule.add(roomba)
            self.grid.place_agent(roomba, agent_pos)
            self.agent_list.append(roomba)

        # Obstáculos aleatorios
        for _ in range(self.num_obstacles):
            pos = pos_gen(self.grid.width, self.grid.height)
            while not self.grid.is_cell_empty(pos):
                pos = pos_gen(self.grid.width, self.grid.height)
            obstacle = ObstacleAgent(self.next_id(), self)
            self.grid.place_agent(obstacle, pos)
            self.schedule.add(obstacle)

        # Basura aleatoria
        for _ in range(self.num_trash):
            pos = pos_gen(self.grid.width, self.grid.height)
            while not self.grid.is_cell_empty(pos):
                pos = pos_gen(self.grid.width, self.grid.height)
            trash = TrashAgent(self.next_id(), self)
            self.grid.place_agent(trash, pos)
            self.schedule.add(trash)

        # DataCollector
        self.datacollector = DataCollector(
            model_reporters={
                "Time": lambda m: m.schedule.time,
                "PercentageCleaned": percentage_cleaned,
                "AverageBatteryLevel": average_battery_level,
                "TotalSteps": total_steps_taken,
            },
            agent_reporters={
                "AgentID": lambda a: a.unique_id if isinstance(a, RandomAgent) else None,
                "Battery": lambda a: a.battery if isinstance(a, RandomAgent) else None,
                "Steps": lambda a: a.steps_taken if isinstance(a, RandomAgent) else None,
            }
        )

        self.datacollector.collect(self)

    def step(self):
        self.schedule.step()
        self.datacollector.collect(self)

        # Terminar si no hay basura
        if count_trash_agents(self) == 0:
            self.running = False
