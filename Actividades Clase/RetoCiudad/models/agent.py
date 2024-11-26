# agent.py
from mesa import Agent

class Car(Agent):
    """
    Agent that represents a car in the simulation.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
        self.model_type = "car"
        self.rotation = 0  # Orientation in degrees
        self.scale = [1, 1, 1]  # Scale for 3D model
        self.destination = None  # Destination coordinates

    def move(self):
        """
        Moves the car randomly for now.
        """
        possible_steps = self.model.grid.get_neighborhood(self.pos, moore=False, include_center=False)
        possible_steps = [pos for pos in possible_steps if self.model.grid.is_cell_empty(pos)]
        if possible_steps:
            new_position = self.random.choice(possible_steps)
            # Update rotation based on movement direction
            dx = new_position[0] - self.pos[0]
            dy = new_position[1] - self.pos[1]
            if dx > 0:
                self.rotation = 0
            elif dx < 0:
                self.rotation = 180
            elif dy > 0:
                self.rotation = 90
            elif dy < 0:
                self.rotation = -90
            self.model.grid.move_agent(self, new_position)

    def step(self):
        """
        Agent's action at each step.
        """
        self.move()

class Traffic_Light(Agent):
    """
    Agent that represents a traffic light.
    """
    def __init__(self, unique_id, model, state=False, timeToChange=10):
        super().__init__(unique_id, model)
        self.state = state  # True for green, False for red
        self.timeToChange = timeToChange
        self.model_type = "traffic_light"
        self.rotation = 0
        self.scale = [1, 1, 1]

    def step(self):
        """
        Changes the state of the traffic light based on timeToChange.
        """
        if self.model.schedule.steps % self.timeToChange == 0:
            self.state = not self.state

class Destination(Agent):
    """
    Agent that represents a destination point.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
        self.model_type = "destination"
        self.rotation = 0
        self.scale = [1, 1, 1]

    def step(self):
        pass

class Obstacle(Agent):
    """
    Agent that represents an obstacle.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
        self.model_type = "obstacle"
        self.rotation = 0
        self.scale = [1, 1, 1]

    def step(self):
        pass

class Road(Agent):
    """
    Agent that represents a road tile.
    """
    def __init__(self, unique_id, model, direction="Left"):
        super().__init__(unique_id, model)
        self.direction = direction
        self.model_type = "road"
        self.rotation = 0
        self.scale = [1, 1, 1]

    def step(self):
        pass
