
# Ramiro Flores Villarreal
# Actividad ROOMBA
# Simulacion 1
# A01710879

from mesa import Agent

# Agente ROOMBA
class RandomAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
        self.steps_taken = 0
        self.battery = 100  
        self.visited_cells = set()  

    def get_next_move_towards(self, target_pos):

        possible_steps = self.model.grid.get_neighborhood(
            self.pos,
            moore=True,
            include_center=False
        )

        cell_contents = [self.model.grid.get_cell_list_contents([pos]) for pos in possible_steps]

        def is_cell_free(cell_agents):
            for agent in cell_agents:
                if isinstance(agent, ObstacleAgent) or isinstance(agent, RandomAgent):
                    return False
            return True  

        possible_moves = [pos for pos, agents in zip(possible_steps, cell_contents) if is_cell_free(agents)]

        if possible_moves:
            min_distance = None
            best_move = None
            for move in possible_moves:
                distance = self.get_distance(move, target_pos)
                if min_distance is None or distance < min_distance:
                    min_distance = distance
                    best_move = move
            return best_move
        else:
            return None

    def get_distance(self, pos1, pos2):
        x1, y1 = pos1
        x2, y2 = pos2
        return ((x1 - x2)**2 + (y1 - y2)**2) ** 0.5

    def move(self):
        if self.battery <= 0:
            return  


        cell_agents = self.model.grid.get_cell_list_contents([self.pos])
        on_charging_station = any(isinstance(agent, ChargingStationAgent) for agent in cell_agents)
        if on_charging_station:
            # Recharge battery
            self.battery = min(100, self.battery + 5)
            if self.battery < 100:
                return


        # Restar bateria por accion
        self.battery -= 1
        if self.battery <= 0:
            self.battery = 0
            return  # Can't act

        # Marcar celdas visitadas
        self.visited_cells.add(self.pos)

        # Saber cuando cargar bateria
        if self.battery <= 20 and not on_charging_station:
            charging_stations = self.model.charging_stations_positions
            target_pos = charging_stations[0]  
            next_move = self.get_next_move_towards(target_pos)
            if next_move:
                self.model.grid.move_agent(self, next_move)
                self.steps_taken += 1
                self.visited_cells.add(self.pos)
        else:
            # Buscar basura
            neighborhood = self.model.grid.get_neighborhood(
                self.pos,
                moore=True,
                include_center=False
            )
            trash_positions = []
            for pos in neighborhood:
                cell_agents = self.model.grid.get_cell_list_contents([pos])
                if any(isinstance(agent, TrashAgent) for agent in cell_agents):
                    trash_positions.append(pos)

            if trash_positions:
                # Acercarse a basura
                min_distance = None
                target_pos = None
                for pos in trash_positions:
                    distance = self.get_distance(self.pos, pos)
                    if min_distance is None or distance < min_distance:
                        min_distance = distance
                        target_pos = pos
                next_move = self.get_next_move_towards(target_pos)
                if next_move:
                    self.model.grid.move_agent(self, next_move)
                    self.steps_taken += 1
                    self.visited_cells.add(self.pos)
            else:
                # No hay basura, tomar preferencia a celda sin visitar
                possible_steps = self.model.grid.get_neighborhood(
                    self.pos,
                    moore=True,
                    include_center=False
                )
                cell_contents = [self.model.grid.get_cell_list_contents([pos]) for pos in possible_steps]

                def is_cell_free(cell_agents):
                    for agent in cell_agents:
                        if isinstance(agent, ObstacleAgent) or isinstance(agent, RandomAgent):
                            return False
                    return True  

                possible_moves = [pos for pos, agents in zip(possible_steps, cell_contents) if is_cell_free(agents)]

                # Priorizar celdas no visitadas
                unvisited_moves = [pos for pos in possible_moves if pos not in self.visited_cells]

                if unvisited_moves:
                    next_move = self.random.choice(unvisited_moves)
                elif possible_moves:
                    next_move = self.random.choice(possible_moves)
                else:
                    next_move = None  

                if next_move:
                    self.model.grid.move_agent(self, next_move)
                    self.steps_taken += 1
                    self.visited_cells.add(self.pos)


        cell_agents = self.model.grid.get_cell_list_contents([self.pos])
        for agent in cell_agents:
            if isinstance(agent, TrashAgent):
                self.model.grid.remove_agent(agent)
                self.model.schedule.remove(agent)

                self.battery -= 1
                if self.battery <= 0:
                    self.battery = 0
                break  

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

class ChargingStationAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  
