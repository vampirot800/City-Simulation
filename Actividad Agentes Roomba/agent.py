# agent.py
from mesa import Agent

class RandomAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
        self.steps_taken = 0

    def move(self):
        possible_steps = self.model.grid.get_neighborhood(
            self.pos,
            moore=True,
            include_center=True
        )
        cell_contents = [self.model.grid.get_cell_list_contents([pos]) for pos in possible_steps]

        def is_cell_free(cell_agents):
            for agent in cell_agents:
                if isinstance(agent, ObstacleAgent) or isinstance(agent, RandomAgent):
                    return False
            return True

        possible_moves = [pos for pos, agents in zip(possible_steps, cell_contents) if is_cell_free(agents)]
        
        if possible_moves:
            next_move = self.random.choice(possible_moves)
            if self.random.random() < 0.1:
                self.model.grid.move_agent(self, next_move)
                self.steps_taken += 1

                # Verificar y eliminar TrashAgent si está presente
                cell_agents = self.model.grid.get_cell_list_contents([self.pos])
                for agent in cell_agents:
                    if isinstance(agent, TrashAgent):
                        self.model.grid.remove_agent(agent)
                        self.model.schedule.remove(agent)
        else:
            pass

    def step(self):
        self.move()

class ObstacleAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  

class TrashAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  

