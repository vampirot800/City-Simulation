
# Ramiro Flores Villarreal
# Actividad Automata Celular
# A01710879

from mesa import Agent

class Cell(Agent):
    """
    A cell in the grid that can be 'Alive' or 'Dead'.
    """

    def __init__(self, pos, model, initial_state='Dead'):
        super().__init__(pos, model)
        self.pos = pos
        self.state = initial_state
        self.next_state = None

    def step(self):
        """
        Determine the cell's next state based on the states of the three cells above it.
        """
        x, y = self.pos
        grid_height = self.model.grid.height

        # Skip the top row (since there are no cells above it)
        if y == grid_height - 1:
            return

        # Get the three cells above
        neighbors = []
        for dx in [-1, 0, 1]:
            nx = x + dx
            ny = y + 1  # Row above
            if 0 <= nx < self.model.grid.width and 0 <= ny < grid_height:
                neighbor_agents = self.model.grid.get_cell_list_contents([(nx, ny)])
                if neighbor_agents:
                    neighbors.append(neighbor_agents[0])
                else:
                    # Treat empty cells as 'Dead'
                    neighbors.append(DummyAgent())
            else:
                # Out of bounds positions are 'Dead'
                neighbors.append(DummyAgent())

        # Get the states of the neighbors
        states = [1 if neighbor.state == 'Alive' else 0 for neighbor in neighbors]

        # Map the combination to the next state using the provided rules
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
        Update the cell's state to the next state.
        """
        if self.next_state is not None:
            self.state = self.next_state
            self.next_state = None

class DummyAgent:
    state = 'Dead'
