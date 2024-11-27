# model.py
from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import Obstacle, Road, Traffic_Light, Car, Destination
import os
import networkx as nx

class RandomModel(Model):
    """
    Creates a new model with agents based on a fixed map from a text file.
    """
    def __init__(self):
        super().__init__(seed=42)

        # Relative path to the map file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        map_file = os.path.join(current_dir, '..', 'city_files', 'map.txt') 

        # Load map data from the file
        try:
            with open(map_file, 'r') as file:
                map_data = [line.strip() for line in file]
        except FileNotFoundError:
            print(f"Map file not found at {map_file}")
            map_data = []


        # Set the grid dimensions based on the map size
        self.height = len(map_data)
        self.width = len(map_data[0]) if self.height > 0 else 0
        self.grid = MultiGrid(self.width, self.height, torus=False)

        # Initialize the scheduler
        self.schedule = RandomActivation(self)

        self.running = True

        # Lists to hold agents
        self.vehicles = []
        self.destinations = []

        # Create agents based on the map
        for z, row in enumerate(map_data):
            for x, char in enumerate(row):
                if char in [">", "<", "^", "v"]:  # Road directions
                    street_agent = Road(f"S-{x}-{z}", self, direction=char)
                    self.schedule.add(street_agent)
                    self.grid.place_agent(street_agent, (x, z))
                elif char == "#":  # Obstacle
                    building_agent = Obstacle(f"B-{x}-{z}", self)
                    self.schedule.add(building_agent)
                    self.grid.place_agent(building_agent, (x, z))
                elif char == "D":  # Destination
                    destination_agent = Destination(f"D-{x}-{z}", self, type_="destination", identifier=f"D-{x}-{z}")
                    self.schedule.add(destination_agent)
                    self.grid.place_agent(destination_agent, (x, z))
                    self.destinations.append(destination_agent)
                elif char == "s":
                    traffic_agent = Traffic_Light(f"L1-{x}-{z}", self, state=False, timeToChange=10)
                    self.schedule.add(traffic_agent)
                    self.grid.place_agent(traffic_agent, (x, z))
                    street_agent = Road(f"S-{x}-{z}", self, direction="Straight")  # Assign appropriate direction
                    self.schedule.add(street_agent)
                    self.grid.place_agent(street_agent, (x, z))
                elif char == "S":
                    traffic_agent = Traffic_Light(f"L2-{x}-{z}", self, state=True, timeToChange=10)
                    self.schedule.add(traffic_agent)
                    self.grid.place_agent(traffic_agent, (x, z))
                    street_agent = Road(f"S-{x}-{z}", self, direction="Straight")  # Assign appropriate direction
                    self.schedule.add(street_agent)
                    self.grid.place_agent(street_agent, (x, z))

        # Check if there are enough destinations
        required_destinations = 4
        print ("hola",self.destinations)
        if len(self.destinations) < required_destinations:
            print(f"Not enough destinations. Required: {required_destinations}, Found: {len(self.destinations)}")
            # Optionally, handle this case by adding default destinations or reducing the number of vehicles
            # For simplicity, we'll assign available destinations to multiple vehicles

        # Assign destinations to cars
        for i in range(1, 5):  # Creating 4 cars
            car_id = f"Car-{i}"
            if len(self.destinations) >= i:
                destination = self.destinations[i-1]
            elif len(self.destinations) > 0:
                destination = self.destinations[-1]  # Assign the last destination if not enough
                print(f"Assigning Car-{i} to Destination-{destination.unique_id}")
            else:
                destination = None
                print(f"No destinations available to assign to Car-{i}")

            # Assign a default vision or determine based on initial Road agent
            default_vision = "Up"  # You can modify this as needed

            if destination is not None:
                car = Car(car_id, self, Destination=destination, vision=default_vision)
                self.schedule.add(car)

                # Assign initial positions based on your logic
                if i == 1:
                    initial_position = (0, self.width - 1)
                elif i == 2:
                    initial_position = (self.height - 1, 0)
                elif i == 3:
                    initial_position = (0, 0)
                elif i == 4:
                    initial_position = (self.height - 1, self.width - 1)

                # Ensure the initial position is a Road
                cell_contents = self.grid.get_cell_list_contents(initial_position)
                if any(isinstance(agent, Road) for agent in cell_contents):
                    self.grid.place_agent(car, initial_position)
                    self.vehicles.append(car)
                else:
                    print(f"Initial position {initial_position} for {car_id} is not a Road.")
            else:
                print(f"Car-{i} not placed due to lack of a destination.")

        # Create the road network graph
        self.G = nx.Graph()
        for x in range(self.width):
            for y in range(self.height):
                cell_contents = self.grid.get_cell_list_contents((x, y))
                if any(isinstance(agent, Road) for agent in cell_contents):
                    self.G.add_node((x, y))
        # Add edges between adjacent road nodes
        for node in list(self.G.nodes()):
            x, y = node
            neighbors = [
                (x2, y2) for x2, y2 in [
                    (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)
                ]
                if (x2, y2) in self.G.nodes()
            ]
            for neighbor in neighbors:
                self.G.add_edge(node, neighbor)

    def step(self):
        """Advance the model by one step."""
        self.schedule.step()
