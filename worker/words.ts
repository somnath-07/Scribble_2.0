// Original, hand-curated common prompts. Kept in source so rooms need no external API.
const animals = [
  'alligator', 'alpaca', 'ant', 'anteater', 'armadillo', 'baboon', 'badger', 'bat', 'bear', 'beaver',
  'bee', 'beetle', 'bison', 'butterfly', 'camel', 'cat', 'caterpillar', 'chameleon', 'cheetah', 'chicken',
  'chimpanzee', 'cobra', 'cow', 'crab', 'crocodile', 'deer', 'dog', 'dolphin', 'donkey', 'duck',
  'eagle', 'elephant', 'falcon', 'ferret', 'flamingo', 'fox', 'frog', 'giraffe', 'goat', 'goldfish',
  'gorilla', 'hamster', 'hedgehog', 'hippopotamus', 'horse', 'hummingbird', 'hyena', 'iguana', 'jaguar', 'jellyfish',
  'kangaroo', 'koala', 'ladybug', 'lemur', 'leopard', 'lion', 'llama', 'lobster', 'meerkat', 'monkey',
  'moose', 'mosquito', 'mouse', 'octopus', 'orangutan', 'ostrich', 'otter', 'owl', 'panda', 'panther',
  'parrot', 'peacock', 'pelican', 'penguin', 'pig', 'pigeon', 'polar bear', 'porcupine', 'rabbit', 'raccoon',
  'rat', 'rhinoceros', 'rooster', 'scorpion', 'seahorse', 'seal', 'shark', 'sheep', 'skunk', 'sloth',
  'snail', 'snake', 'spider', 'squid', 'squirrel', 'starfish', 'swan', 'tiger', 'tortoise', 'tucan',
  'turtle', 'walrus', 'whale', 'wolf', 'zebra',
];

const food = [
  'apple', 'apricot', 'avocado', 'bacon', 'bagel', 'banana', 'barbecue', 'biscuit', 'blueberry', 'bread',
  'broccoli', 'brownie', 'burger', 'burrito', 'butter', 'cabbage', 'cake', 'candy', 'carrot', 'cereal',
  'cheese', 'cheesecake', 'cherry', 'chocolate', 'coconut', 'cookie', 'corn', 'croissant', 'cupcake', 'curry',
  'doughnut', 'dumpling', 'egg', 'eggplant', 'fish and chips', 'french fries', 'garlic', 'ginger', 'grapes', 'honey',
  'hot dog', 'ice cream', 'jam', 'jelly', 'kiwi', 'lemon', 'lettuce', 'lime', 'lollipop', 'macaroni',
  'mango', 'marshmallow', 'meatball', 'milk', 'muffin', 'mushroom', 'noodles', 'olive', 'omelette', 'onion',
  'orange', 'pancake', 'pasta', 'peach', 'peanut', 'pear', 'peas', 'pepper', 'pie', 'pineapple',
  'pizza', 'popcorn', 'potato', 'pretzel', 'pumpkin', 'rice', 'salad', 'sandwich', 'sausage', 'smoothie',
  'soup', 'spaghetti', 'strawberry', 'sushi', 'taco', 'toast', 'tomato', 'waffle', 'watermelon', 'yogurt',
];

const objects = [
  'alarm clock', 'anchor', 'backpack', 'balloon', 'basket', 'battery', 'bed', 'bell', 'belt', 'binoculars',
  'blanket', 'book', 'bottle', 'bowl', 'box', 'bracelet', 'broom', 'bucket', 'button', 'candle',
  'carpet', 'chair', 'clock', 'coat', 'comb', 'compass', 'couch', 'crayon', 'cup', 'curtain',
  'desk', 'door', 'drum', 'envelope', 'fan', 'feather', 'fire extinguisher', 'flashlight', 'fork', 'frying pan',
  'glasses', 'globe', 'hammer', 'hanger', 'hat', 'helmet', 'key', 'kite', 'ladder', 'lamp',
  'lantern', 'lock', 'magnifying glass', 'mirror', 'mop', 'mug', 'newspaper', 'notebook', 'paintbrush', 'paper clip',
  'pencil', 'pillow', 'plate', 'pocket watch', 'purse', 'remote control', 'ring', 'rope', 'ruler', 'scissors',
  'screwdriver', 'shovel', 'soap', 'spoon', 'stapler', 'suitcase', 'sunglasses', 'table', 'teapot', 'telescope',
  'toothbrush', 'toothpaste', 'towel', 'trash can', 'umbrella', 'vase', 'wallet', 'watering can', 'whistle', 'window',
];

const places = [
  'airport', 'amusement park', 'aquarium', 'bakery', 'bank', 'barn', 'beach', 'bridge', 'bus stop', 'campsite',
  'castle', 'cave', 'cinema', 'circus', 'city', 'classroom', 'coffee shop', 'desert', 'farm', 'fire station',
  'forest', 'garden', 'gas station', 'harbor', 'hospital', 'hotel', 'island', 'jungle', 'library', 'lighthouse',
  'market', 'museum', 'office', 'park', 'parking lot', 'playground', 'police station', 'post office', 'restaurant', 'school',
  'shopping mall', 'stadium', 'subway station', 'supermarket', 'swimming pool', 'theater', 'train station', 'tree house', 'village', 'waterfall',
  'wind farm', 'zoo', 'moon base', 'space station', 'volcano',
];

const actions = [
  'baking', 'balancing', 'bouncing', 'bowling', 'brushing', 'camping', 'catching', 'clapping', 'climbing', 'cooking',
  'crawling', 'crying', 'dancing', 'digging', 'diving', 'dreaming', 'drinking', 'driving', 'eating', 'fishing',
  'flying', 'gardening', 'hammering', 'hiking', 'hugging', 'jogging', 'jumping', 'kicking', 'knitting', 'laughing',
  'lifting', 'painting', 'planting', 'playing guitar', 'reading', 'rowing', 'running', 'sailing', 'singing', 'skating',
  'skiing', 'sleeping', 'sneezing', 'snowboarding', 'swimming', 'thinking', 'throwing', 'typing', 'walking', 'washing',
  'watering', 'waving', 'whispering', 'whistling', 'writing', 'yawning', 'ziplining', 'juggling', 'meditating', 'photographing',
];

const technology = [
  'antenna', 'calculator', 'camera', 'cassette', 'charger', 'computer', 'computer mouse', 'controller', 'drone', 'earbuds',
  'electric car', 'floppy disk', 'game console', 'headphones', 'keyboard', 'laptop', 'laser', 'light bulb', 'microchip', 'microphone',
  'microscope', 'monitor', 'password', 'printer', 'projector', 'radio', 'robot', 'satellite', 'smart watch', 'smartphone',
  'solar panel', 'speaker', 'tablet', 'television', 'thermometer', 'tripod', 'usb drive', 'vacuum cleaner', 'video call', 'video camera',
  'virtual reality', 'webcam', 'wifi router', 'wind turbine', 'x ray', '3d printer', 'barcode', 'circuit board', 'electric scooter', 'traffic camera',
  'rocket engine', 'security camera', 'touchscreen', 'walkie talkie', 'weather satellite',
];

const nature = [
  'avalanche', 'bamboo', 'blizzard', 'branch', 'bush', 'cactus', 'cliff', 'cloud', 'comet', 'coral reef',
  'crystal', 'daisy', 'dandelion', 'earthquake', 'fern', 'fire', 'flower', 'fog', 'fossil', 'galaxy',
  'geyser', 'glacier', 'grass', 'hail', 'horizon', 'iceberg', 'lake', 'lava', 'leaf', 'lightning',
  'meteor', 'moon', 'mountain', 'mud', 'mushroom cloud', 'ocean', 'palm tree', 'planet', 'rain', 'rainbow',
  'river', 'rock', 'rose', 'sand dune', 'seaweed', 'snowflake', 'star', 'storm', 'sun', 'sunflower',
  'thunder', 'tornado', 'tree', 'tsunami', 'valley', 'vine', 'waterfall', 'wave', 'wildfire', 'wind',
];

const occupations = [
  'actor', 'architect', 'artist', 'astronaut', 'baker', 'barber', 'bus driver', 'carpenter', 'cashier', 'chef',
  'clown', 'construction worker', 'dentist', 'detective', 'doctor', 'electrician', 'farmer', 'firefighter', 'fisherman', 'flight attendant',
  'florist', 'gardener', 'judge', 'lifeguard', 'magician', 'mail carrier', 'mechanic', 'musician', 'nurse', 'painter',
  'photographer', 'pilot', 'plumber', 'police officer', 'reporter', 'scientist', 'singer', 'teacher', 'veterinarian', 'waiter',
  'writer', 'zookeeper', 'engineer', 'librarian', 'paramedic', 'sailor', 'tailor', 'taxi driver', 'coach', 'dancer',
];

const sports = [
  'archery', 'badminton', 'baseball', 'basketball', 'boxing', 'canoeing', 'chess', 'cricket', 'cycling', 'darts',
  'diving board', 'fencing', 'football', 'golf', 'gymnastics', 'high jump', 'hockey', 'horse racing', 'ice skating', 'kayaking',
  'karate', 'medal', 'mountain biking', 'parachute', 'ping pong', 'pole vault', 'race car', 'rock climbing', 'rugby', 'running track',
  'skateboard', 'ski jump', 'snorkeling', 'soccer ball', 'softball', 'surfing', 'swimming goggles', 'tennis', 'trophy', 'volleyball',
  'water polo', 'weightlifting', 'wrestling', 'yoga', 'goalkeeper', 'scoreboard', 'referee', 'finish line', 'relay race', 'hurdles',
];

const entertainment = [
  'accordion', 'arcade', 'ballerina', 'banjo', 'board game', 'card trick', 'carnival', 'comic book', 'concert', 'confetti',
  'costume', 'disco ball', 'drum set', 'fairy tale', 'fireworks', 'flute', 'fortune cookie', 'gift box', 'guitar', 'harp',
  'jigsaw puzzle', 'karaoke', 'magic wand', 'maracas', 'movie ticket', 'music notes', 'paint palette', 'party hat', 'piano', 'picnic',
  'puppet', 'roller coaster', 'saxophone', 'stage', 'storybook', 'tambourine', 'trampoline', 'treasure map', 'trumpet', 'violin',
  'wizard hat', 'yo-yo', 'drumstick', 'microphone stand', 'origami', 'paper airplane', 'photo booth', 'snow globe', 'toy train', 'water slide',
];

const transport = [
  'airplane', 'ambulance', 'bicycle', 'bulldozer', 'bus', 'cable car', 'canoe', 'car', 'caravan', 'cargo ship',
  'cement mixer', 'crane truck', 'cruise ship', 'dump truck', 'fire engine', 'forklift', 'helicopter', 'hot air balloon', 'ice cream truck', 'jeep',
  'jet ski', 'kayak', 'limousine', 'locomotive', 'motorbike', 'police car', 'racecar', 'rickshaw', 'rocket', 'rowboat',
  'school bus', 'scooter', 'skateboard', 'spaceship', 'speedboat', 'submarine', 'taxi', 'tractor', 'train', 'tram',
  'unicycle', 'van', 'wagon', 'yacht', 'tow truck', 'delivery truck', 'ferry', 'gondola', 'monorail', 'snowmobile',
];

const everyday = [
  'birthday candle', 'bubble bath', 'campfire', 'doorbell', 'dream catcher', 'drinking straw', 'family photo', 'feather duster', 'first aid kit', 'flower pot',
  'fountain pen', 'friendship bracelet', 'garden hose', 'grocery bag', 'hair dryer', 'handshake', 'house key', 'ice cube', 'jack in the box', 'kitchen sink',
  'laundry basket', 'mailbox', 'measuring tape', 'moonlight', 'night light', 'oven mitt', 'park bench', 'piggy bank', 'pinwheel', 'rain boots',
  'rubber duck', 'sand castle', 'shopping cart', 'sleeping bag', 'soap bubble', 'sock puppet', 'spider web', 'street light', 'suit and tie', 'sun hat',
  'tea bag', 'tennis shoe', 'toilet paper', 'tool box', 'tooth fairy', 'traffic light', 'welcome mat', 'wheelbarrow', 'wind chime', 'winter coat',
  'wooden spoon', 'wristwatch', 'zipper', 'bookshelf', 'ceiling fan', 'coffee mug', 'desk lamp', 'door handle', 'paper crown', 'picnic basket',
];

export const BUILT_IN_WORDS = [...new Set([
  ...animals,
  ...food,
  ...objects,
  ...places,
  ...actions,
  ...technology,
  ...nature,
  ...occupations,
  ...sports,
  ...entertainment,
  ...transport,
  ...everyday,
])];

export function getWordPool(mode: 'NORMAL' | 'HIDDEN' | 'COMBINATION'): string[] {
  if (mode === 'COMBINATION') {
    const phrases = BUILT_IN_WORDS.filter((word) => word.includes(' '));
    return phrases.length >= 20 ? phrases : BUILT_IN_WORDS;
  }
  const singleWords = BUILT_IN_WORDS.filter((word) => !word.includes(' '));
  return singleWords.length >= 100 ? singleWords : BUILT_IN_WORDS;
}
