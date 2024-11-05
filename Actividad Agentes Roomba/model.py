# model.py
from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from mesa import DataCollector
from agent import RandomAgent, ObstacleAgent, TrashAgent

def count_trash_agents(model):
    return sum(1 for agent in model.schedule.agents if isinstance(agent, TrashAgent))

class RandomModel(Model):
    def __init__(self, N, width, height, num_obstacles, num_trash):
        super().__init__()  # Añade esta línea para inicializar el modelo base
        self.num_agents = N
        self.num_obstacles = num_obstacles
        self.num_trash = num_trash
        self.grid = MultiGrid(width, height, torus=False)
        self.schedule = RandomActivation(self)
        self.running = True
        self.datacollector = DataCollector(
            model_reporters={"TrashRemaining": count_trash_agents},
            agent_reporters={"Steps": lambda a: a.steps_taken if isinstance(a, RandomAgent) else 0}
        )

        # Crear borde con ObstacleAgents
        border = [(x, y) for y in range(height) for x in range(width) if y in [0, height - 1] or x in [0, width - 1]]
        for pos in border:
            obs = ObstacleAgent(self.next_id(), self)
            self.grid.place_agent(obs, pos)
            self.schedule.add(obs)

        pos_gen = lambda w, h: (self.random.randrange(w), self.random.randrange(h))

        # Agregar RandomAgents en posiciones aleatorias
        for i in range(self.num_agents):
            a = RandomAgent(self.next_id(), self)
            self.schedule.add(a)
            pos = pos_gen(self.grid.width, self.grid.height)
            while not self.grid.is_cell_empty(pos):
                pos = pos_gen(self.grid.width, self.grid.height)
            self.grid.place_agent(a, pos)

        # Agregar TrashAgents en posiciones aleatorias
        for i in range(self.num_trash):
            trash = TrashAgent(self.next_id(), self)
            self.schedule.add(trash)
            pos = pos_gen(self.grid.width, self.grid.height)
            while not self.grid.is_cell_empty(pos):
                pos = pos_gen(self.grid.width, self.grid.height)
            self.grid.place_agent(trash, pos)

        self.datacollector.collect(self)

    def step(self):
        self.schedule.step()
        self.datacollector.collect(self)
