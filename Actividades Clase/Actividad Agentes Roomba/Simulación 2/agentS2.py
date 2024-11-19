# agent.py
# Ramiro Flores Villarreal
# Actividad ROOMBA
# Simulacion 2
# A01710879

from mesa import Agent

class RandomAgent(Agent):
    def __init__(self, unique_id, model, charging_station_pos):
        super().__init__(unique_id, model)
        self.steps_taken = 0
        self.battery = 100  # Batería inicial
        self.visited_cells = set()  # Celdas visitadas
        self.charging_station_pos = charging_station_pos  # Posición de su estación de carga

    def get_next_move_towards(self, target_pos):
        possible_steps = self.model.grid.get_neighborhood(
            self.pos,
            moore=True,
            include_center=False
        )

        cell_contents = [self.model.grid.get_cell_list_contents([pos]) for pos in possible_steps]

        def is_cell_free(cell_agents):
            for agent in cell_agents:
                if isinstance(agent, ObstacleAgent) or (isinstance(agent, RandomAgent) and agent != self):
                    return False
            return True  # Permitir moverse a celdas con ChargingStationAgent y TrashAgent

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
            return  # Sin batería, no puede actuar

        # Verificar si está en una estación de carga y recargar
        cell_agents = self.model.grid.get_cell_list_contents([self.pos])
        on_charging_station = any(isinstance(agent, ChargingStationAgent) for agent in cell_agents)
        if on_charging_station:
            # Recargar batería
            self.battery = min(100, self.battery + 5)
            if self.battery < 100:
                # Permanecer en la estación hasta cargar completamente
                return

        # Decrementar batería por acción
        self.battery -= 1
        if self.battery <= 0:
            self.battery = 0
            return  # No puede actuar

        # Marcar celdas visitadas
        self.visited_cells.add(self.pos)

        # Decidir acción
        if self.battery <= 20 and not on_charging_station:
            # Moverse hacia su propia estación de carga
            target_pos = self.charging_station_pos
            next_move = self.get_next_move_towards(target_pos)
            if next_move:
                self.model.grid.move_agent(self, next_move)
                self.steps_taken += 1
                self.visited_cells.add(self.pos)
        else:
            # Buscar basura cercana
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
                # Moverse hacia la basura más cercana
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
                # No hay basura cercana, moverse a celdas no visitadas si es posible
                possible_steps = self.model.grid.get_neighborhood(
                    self.pos,
                    moore=True,
                    include_center=False
                )
                cell_contents = [self.model.grid.get_cell_list_contents([pos]) for pos in possible_steps]

                def is_cell_free(cell_agents):
                    for agent in cell_agents:
                        if isinstance(agent, ObstacleAgent) or (isinstance(agent, RandomAgent) and agent != self):
                            return False
                    return True  # Permitir moverse a celdas con ChargingStationAgent y TrashAgent

                possible_moves = [pos for pos, agents in zip(possible_steps, cell_contents) if is_cell_free(agents)]

                # Priorizar celdas no visitadas
                unvisited_moves = [pos for pos in possible_moves if pos not in self.visited_cells]

                if unvisited_moves:
                    next_move = self.random.choice(unvisited_moves)
                elif possible_moves:
                    next_move = self.random.choice(possible_moves)
                else:
                    next_move = None  # Sin movimientos disponibles

                if next_move:
                    self.model.grid.move_agent(self, next_move)
                    self.steps_taken += 1
                    self.visited_cells.add(self.pos)

        # Después de moverse, verificar si hay basura y limpiarla
        cell_agents = self.model.grid.get_cell_list_contents([self.pos])
        for agent in cell_agents:
            if isinstance(agent, TrashAgent):
                self.model.grid.remove_agent(agent)
                self.model.schedule.remove(agent)
                # Reducir batería por limpiar
                self.battery -= 1
                if self.battery <= 0:
                    self.battery = 0
                break  # Solo una basura por celda

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
