# Ramiro Flores Villarreal
# Actividad Automata Celular
# A01710879

from mesa import Agent

class Cell(Agent):
    """
    Una celda en la cuadrícula que puede estar en estado 'Alive' o 'Dead'.
    """

    def __init__(self, pos, model, initial_state='Dead'):
        super().__init__(pos, model)
        self.pos = pos
        self.state = initial_state
        self.next_state = None

    def step(self):
        """
        Determina el próximo estado de la celda basado en los estados de las tres celdas de arriba.
        """
        x, y = self.pos
        grid_height = self.model.grid.height

        # Para las celdas en la fila superior, mantenemos su estado actual
        if y == grid_height - 1:
            self.next_state = self.state  # Mantiene el mismo estado
            return

        # Obtener los tres vecinos de arriba
        neighbors = []
        for dx in [-1, 0, 1]:
            nx = x + dx
            ny = y + 1  # Fila de arriba
            if 0 <= nx < self.model.grid.width and 0 <= ny < grid_height:
                neighbor_agents = self.model.grid.get_cell_list_contents([(nx, ny)])
                if neighbor_agents:
                    neighbors.append(neighbor_agents[0])
                else:
                    # Tratamos las celdas vacías como 'Dead'
                    neighbors.append(DummyAgent())
            else:
                # Las posiciones fuera de los límites se consideran 'Dead'
                neighbors.append(DummyAgent())

        # Obtener los estados de los vecinos
        states = [1 if neighbor.state == 'Alive' else 0 for neighbor in neighbors]

        # Mapear la combinación al siguiente estado usando las reglas proporcionadas
        combination = ''.join(map(str, states))
        rule_dict = {
            '111': 'Dead',
            '110': 'Alive',
            '101': 'Dead',
            '100': 'Alive',
            '011': 'Alive',
            '010': 'Dead',
            '001': 'Alive',
            '000': 'Dead'
        }
        self.next_state = rule_dict[combination]

    def advance(self):
        """
        Actualiza el estado de la celda al siguiente estado.
        """
        if self.next_state is not None:
            self.state = self.next_state
            self.next_state = None

class DummyAgent:
    state = 'Dead'
