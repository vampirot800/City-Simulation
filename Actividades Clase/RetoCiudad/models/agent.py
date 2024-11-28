# Import required libraries
from mesa import Agent  # Base class for all agents in Mesa
from collections import deque  # Deque is used for efficient queue operations

# Define a traffic light agent with red and green states
class TrafficLight(Agent):
    """
    Traffic light agent with two possible states: red and green.
    """

    def __init__(self, unique_id, model, red_duration, green_duration, start_offset):
        """
        Initialize the traffic light agent with specific durations for red and green lights.
        Args:
            unique_id: Unique identifier for the agent.
            model: Reference to the model the agent is part of.
            red_duration: Number of steps for which the light remains red.
            green_duration: Number of steps for which the light remains green.
            start_offset: Initial offset to determine the starting state of the light.
        """
        super().__init__(unique_id, model)  # Initialize the base Agent class
        self.red_duration = red_duration  # Duration for red light
        self.green_duration = green_duration  # Duration for green light
        self.total_cycle = red_duration + green_duration  # Total cycle duration (red + green)
        self.current_time = start_offset % self.total_cycle  # Set initial time within the cycle
        self.state = self._get_state_from_time(self.current_time)  # Determine initial state
        self.is_green = self.state == "green"  # Boolean indicating if the light is green
        print(f"Initialized Traffic Light {unique_id} at start {start_offset} with state {self.state}")

    def step(self):
        """
        Update the state of the traffic light for the next time step.
        """
        self.current_time = (self.current_time + 1) % self.total_cycle  # Increment time within cycle
        self.state = self._get_state_from_time(self.current_time)  # Update the state
        self.is_green = self.state == "green"  # Update boolean state
        # print(f"Traffic Light {self.unique_id} changed to {self.state}")

    def _get_state_from_time(self, time_step):
        """
        Get the current state (red or green) based on the time step within the cycle.
        Args:
            time_step: Current time step within the cycle.
        Returns:
            The current state: "red" or "green".
        """
        if time_step < self.red_duration:
            return "red"  # If within red duration, return red
        else:
            return "green"  # Otherwise, return green

# Define a car agent that moves along roads
class Car(Agent):
    """
    Car agent which moves along roads and can stop at traffic lights.
    """
    def __init__(self, unique_id, model, start_position):
        """
        Initialize a new car agent.
        Args:
            unique_id: Unique identifier for the car.
            model: Reference to the model the agent is part of.
            start_position: Initial position of the car.
        """
        super().__init__(unique_id, model)  # Initialize the base Agent class
        self.start_position = start_position  # Store the original starting position
        self.position = start_position  # Current position of the car
        self.time_stopped = 0  # Counter for how long the car has been stopped
        self.destination = self.model.get_random_destination()  # Assign a random destination
        self.route = self.get_route(self.position)  # Calculate the route to the destination
        self.route_index = 0  # Track progress along the route
        self.model.active_cars += 1  # Increment active car count in the model
        self.steps_taken = 0  # Track number of steps taken by the car

    def get_route(self, start):
        """
        Get the route to the destination using BFS.
        Args:
            start: Starting position of the car.
        Returns:
            A list representing the route to the destination.
        """
        key = str(start) + str(self.destination)  # Create a unique key for the route
        if key in self.model.memo:
            self.model.memo_count += 1  # Increment memoized route usage counter
            return self.model.memo[key]  # Return stored route if available

        # If no memoized route, calculate it using BFS
        self.model.no_memo_count += 1
        queue = deque([(start, [])])  # Use a deque to store the nodes to visit
        visited = {start}  # Track visited nodes

        while queue:
            current_position, path = queue.popleft()  # Dequeue the front node
            if current_position == self.destination:
                self.model.memo[key] = path  # Store the route in memoization dictionary
                return path

            # Add neighbors to the queue if they have not been visited
            if current_position not in self.model.graph:
                continue

            for move in self.model.graph[current_position]:
                if move not in visited:
                    visited.add(move)  # Mark the node as visited
                    queue.append((move, path + [move]))  # Enqueue the neighbor with updated path

        return []  # Return an empty list if no route is found

    def step(self):
        """
        Move the car towards its destination or stop if blocked.
        """
        if self.position == self.destination:
            # Car has reached its destination
            print(f"Car {self.unique_id} reached destination {self.destination}")
            self.model.grid.remove_agent(self)  # Remove the car from the grid
            self.model.schedule.remove(self)  # Remove the car from the scheduler
            self.model.active_cars -= 1  # Decrement the count of active cars
            self.model.cars_reached_destination += 1  # Increment the counter of cars that reached their destination
            return

        # Check if route exists; if not, remove the car from the model
        if not self.route:
            print(f"Car {self.unique_id} has no route to destination {self.destination}")
            self.model.grid.remove_agent(self)  # Remove the car from the grid
            self.model.schedule.remove(self)  # Remove the car from the scheduler
            self.model.active_cars -= 1  # Decrement the count of active cars
            return

        # Attempt to move to the next position along the route
        next_move = self.route[self.route_index]  # Get the next position in the route
        can_move = True  # Assume movement is possible

        # Check if the next cell is occupied by a car or blocked by a traffic light
        for agent in self.model.grid.get_cell_list_contents([next_move]):
            if isinstance(agent, Car):
                can_move = False  # Cannot move if another car is present
            elif isinstance(agent, TrafficLight):
                if agent.state == "red":
                    can_move = False  # Cannot move if traffic light is red

        if can_move:
            self.model.grid.move_agent(self, next_move)  # Move the car to the next position
            self.position = next_move  # Update the car's position
            self.route_index += 1  # Move to the next step in the route
            # print(f"Car {self.unique_id} moved to {self.position}")
        else:
            
            # If movement is not possible, increment the time stopped
            self.time_stopped += 1
            print(f"Car {self.unique_id} stopped at {self.position}")

# Define a destination agent representing target locations for cars
class Destination(Agent):
    """
    Destination agent representing a target location for cars.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)  # Initialize the base Agent class

    def finishedAgent(self):

        cell_contents = self.model.grid.get_cell_list_contents(self.pos)

        for agents in cell_contents:
            if isinstance(agent, Car) and Agent.destination == self:
                self.model.finishedAgents += 1

# Define an obstacle agent that blocks car movement
class Obstacle(Agent):
    """
    Obstacle agent that blocks car movement.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)  # Initialize the base Agent class

# Define a road agent representing road cells for car movement
class Road(Agent):
    """
    Road agent where cars can move, with a specific direction for movement.
    """
    def __init__(self, position, model, direction):
        """
        Create a new road agent.
        Args:
            position: Position of the road.
            model: Reference to the model.
            direction: Movement direction for cars on this road.
        """
        super().__init__(position, model)  # Initialize the base Agent class
        self.direction = direction  # Set the movement direction for this road cell
