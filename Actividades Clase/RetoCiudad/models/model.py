# model.py
from mesa import Model, DataCollector  # Import Model and DataCollector classes
from mesa.time import RandomActivation  # RandomActivation to schedule agent actions
from mesa.space import MultiGrid  # MultiGrid for the environment grid
from agent import *  # Import all agents
from collections import deque  # Deque for BFS
import random  # Random for randomness

class CityModel(Model):
    """
    Simulates a city traffic system using agents for roads, cars, traffic lights, and destinations.
    """

    map_data = {
        ">": "right",
        "<": "left",
        "S": 15,  # Standard traffic light
        "s": 7,   # Traffic light with offset
        "#": "Obstacle",
        "v": "down",
        "^": "up",
        "D": "Destination",
    }

    traffic_light_flow = [
        {"pos": (1, 0), "expected": "<"},
        {"pos": (-1, 0), "expected": ">"},
        {"pos": (0, -1), "expected": "^"},
        {"pos": (0, 1), "expected": "v"},
    ]

    movement_vectors = {
        "^": (0, 1),
        "v": (0, -1),
        "<": (-1, 0),
        ">": (1, 0),
    }

    neighbor_constraints = {
        "^": [
            {"pos": (-1, 0), "allowed": "<^D"},
            {"pos": (1, 0), "allowed": ">^D"},
        ],
        "v": [
            {"pos": (-1, 0), "allowed": "<vD"},
            {"pos": (1, 0), "allowed": ">vD"},
        ],
        "<": [
            {"pos": (0, -1), "allowed": "<vD"},
            {"pos": (0, 1), "allowed": "<^D"},
        ],
        ">": [
            {"pos": (0, -1), "allowed": ">vD"},
            {"pos": (0, 1), "allowed": ">^D"},
        ],
    }

    def __init__(self, width, height, lines, steps_dist_max):
        """
        Initializes the CityModel.
        Args:
            width: Width of the grid.
            height: Height of the grid.
            lines: Map layout as a list of strings.
            steps_dist_max: Maximum steps for step distribution tracking.
        """
        super().__init__()

        self.destinations = []  # List to store destinations
        self.unique_id = 0  # Unique ID for agents
        self.width = width  # Width of the grid
        self.height = height  # Height of the grid
        self.grid = MultiGrid(self.width, self.height, torus=False)  # Create the grid
        self.schedule = RandomActivation(self)  # Create scheduler for agents
        self.active_cars = 0  # Track the number of active cars
        self.memo_count = 0  # Count memoized routes used
        self.no_memo_count = 0  # Count routes calculated without memoization
        self.cars_reached_destination = 0  # Track the number of cars that reached their destination

        self.step_tracker = {i: 0 for i in range(1, steps_dist_max + 1)}  # Track step distribution

        # Create a data collector to collect data at each step
        self.datacollector = DataCollector(
            {
                **{f"Steps_{i}": lambda m, i=i: m.step_tracker[i] for i in self.step_tracker},
                "ActiveCars": lambda m: m.active_cars,
                "Memoization": lambda m: m.memo_count,
                "NoMemoization": lambda m: m.no_memo_count,
                "CarsReachedDestination": lambda m: m.cars_reached_destination,  # Track cars reaching destination
            }
        )

        self.graph = {}  # Graph representing roads
        self.memo = {}  # Dictionary for memoization of routes

        self.spawn_points = [
            (x, y) for x in [0, self.width - 1] for y in [0, self.height - 1]
        ]

        self.signal_flow_control = {}  # Track signal flow control
        self._initialize_map(lines)  # Initialize the map from lines
        self.running = True  # Set the model to running state

    def _initialize_map(self, lines):
        """
        Initializes the map by parsing the input lines and placing agents.
        """
        graph_created = False
        for r, row in enumerate(lines):
            for c, col in enumerate(row):
                pos = (c, self.height - r - 1)
                if col in ["v", "^", ">", "<"]:
                    agent = Road(pos, self, CityModel.map_data[col])
                    self.grid.place_agent(agent, pos)
                    if not graph_created:
                        self.road_graph_creator(lines, pos)
                        graph_created = True
                elif col in ["S","s"]:
                    self._initialize_traffic_light(pos, col)
                elif col == "#":
                    self.grid.place_agent(Obstacle(f"obs_{r}_{c}", self), pos)
                elif col == "D":
                    self.grid.place_agent(Destination(f"dest_{r}_{c}", self), pos)
                    self.destinations.append(pos)

    def _initialize_traffic_light(self, pos, char):
        """
        Initializes a traffic light agent with red and green states.
        """
        red_duration = 7
        green_duration = 6
        start_offset = 0 if char == "S" else green_duration

        traffic_light = TrafficLight(
            f"tl_{pos[0]}_{pos[1]}",
            self,
            red_duration,
            green_duration,
            start_offset
        )
        self.grid.place_agent(traffic_light, pos)
        self.schedule.add(traffic_light)

    def step(self):
        """
        Advances the model by one step.
        """
        self.schedule.step()  # Advance all agents by one step
        self.datacollector.collect(self)  # Collect data from the model

        # Add new cars every 10 steps
        if self.schedule.steps % 10 == 0:
            for pos in self.spawn_points:
                if self._is_empty(pos):
                    car = Car(self.unique_id, self, pos)
                    self.unique_id += 1
                    self.schedule.add(car)
                    self.grid.place_agent(car, pos)

    def _is_empty(self, pos):
        """
        Checks if a position is empty of cars.
        """
        agents = self.grid.get_cell_list_contents([pos])
        return not any(isinstance(agent, Car) for agent in agents)

    def road_graph_creator(self, lines, start):
        """
        Builds a graph for the road system based on the map.
        """
        queue = deque([start])
        visited = {start}

        while queue:
            cur = queue.popleft()
            cur_direction = self.directions_decode(cur, lines)
            if cur_direction == "D":
                continue

            relative_pos = CityModel.movement_vectors[cur_direction]
            next_pos = (cur[0] + relative_pos[0], cur[1] + relative_pos[1])

            if cur not in self.graph:
                self.graph[cur] = []
            self.graph[cur].append(next_pos)

            if next_pos not in visited:
                visited.add(next_pos)
                queue.append(next_pos)

            for side in CityModel.neighbor_constraints[cur_direction]:
                x, y = cur[0] + side["pos"][0], cur[1] + side["pos"][1]
                if 0 <= x < self.width and 0 <= y < self.height:
                    if lines[self.height - y - 1][x] in side["allowed"]:
                        self.graph[cur].append((x, y))
                        if (x, y) not in visited:
                            visited.add((x, y))
                            queue.append((x, y))

    def directions_decode(self, cur, lines):
        """
        Decodes the direction of a road cell.
        """
        val = lines[self.height - cur[1] - 1][cur[0]]
        if val in "<>^vD":
            return val

        for direction in CityModel.traffic_light_flow:
            x, y = cur[0] + direction["pos"][0], cur[1] + direction["pos"][1]
            if 0 <= x < self.width and 0 <= y < self.height:
                if lines[self.height - y - 1][x] == direction["expected"]:
                    self.signal_flow_control[cur] = CityModel.map_data[direction["expected"]]
                    return direction["expected"]

    def get_random_destination(self):
        """
        Returns a random destination.
        """
        return self.random.choice(self.destinations) if self.destinations else None

    def add_step_count(self, steps):
        """
        Updates the step count distribution.
        """
        if steps in self.step_tracker:
            self.step_tracker[steps] += 1