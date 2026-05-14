// KidAI Code Lab — Curriculum
// Each lesson has: concept explanation, starter code, expected output check, hints

export type LessonTier = 'EXPLORER' | 'BUILDER' | 'CREATOR'

export interface Lesson {
  id: string
  tier: LessonTier
  unit: string           // e.g. "Variables"
  unitIndex: number      // order within unit
  title: string
  emoji: string
  concept: string        // plain-language explanation of the concept
  example: string        // annotated example shown before the challenge
  challenge: string      // what the child must do
  starterCode: string    // pre-filled in editor
  solutionCode: string   // reference solution (not shown to child)
  checkOutput: (output: string) => boolean  // validates their output
  expectedHint: string   // what the output should look like
  hints: string[]
}

// ── EXPLORER (4–7): Scratch-style, very simple JS with output ────────────────
// Simple commands, no syntax pressure — they fill in blanks

const EXPLORER_LESSONS: Lesson[] = [
  {
    id: 'exp-1-1',
    tier: 'EXPLORER',
    unit: 'Say Hello',
    unitIndex: 0,
    title: 'Make the computer talk!',
    emoji: '👋',
    concept: `Computers can say words! We use a special command called **print()** to make the computer write something on the screen.\n\nPut words inside the brackets, and wrap them in "speech marks" like this:\n\n\`print("Hello!")\``,
    example: `print("Hello, world!")`,
    challenge: `Make the computer say **"Hello, I love coding!"**\n\nChange the words inside the speech marks!`,
    starterCode: `print("Hello, ___!")`,
    solutionCode: `print("Hello, I love coding!")`,
    checkOutput: (o) => o.toLowerCase().includes('hello'),
    expectedHint: 'Something starting with Hello',
    hints: [
      'Replace the ___ with your message',
      'Make sure you keep the speech marks " " around your words',
      'Try: print("Hello, I love coding!")',
    ],
  },
  {
    id: 'exp-1-2',
    tier: 'EXPLORER',
    unit: 'Say Hello',
    unitIndex: 1,
    title: 'Print your name!',
    emoji: '✍️',
    concept: `You can print anything you want — even your own name!\n\nTry changing what's inside the speech marks.`,
    example: `print("My name is Pip!")`,
    challenge: `Make the computer say **"My name is [your name]!"**\n\nReplace the ___ with your actual name!`,
    starterCode: `print("My name is ___!")`,
    solutionCode: `print("My name is Pip!")`,
    checkOutput: (o) => o.toLowerCase().includes('my name is'),
    expectedHint: 'My name is ...',
    hints: [
      'Replace ___ with your name',
      'Keep the speech marks around everything',
    ],
  },
  {
    id: 'exp-2-1',
    tier: 'EXPLORER',
    unit: 'Numbers',
    unitIndex: 0,
    title: 'Add numbers together!',
    emoji: '➕',
    concept: `Computers are great at maths! You can add numbers using the **+** sign.\n\nYou don't need speech marks for numbers — just write them!\n\n\`print(2 + 3)\`\n\nThis will print **5**.`,
    example: `print(10 + 5)`,
    challenge: `Make the computer add **7 + 8** and print the answer!`,
    starterCode: `print(___ + ___)`,
    solutionCode: `print(7 + 8)`,
    checkOutput: (o) => o.trim() === '15',
    expectedHint: '15',
    hints: [
      'Replace the first ___ with 7',
      'Replace the second ___ with 8',
      'Try: print(7 + 8)',
    ],
  },
  {
    id: 'exp-2-2',
    tier: 'EXPLORER',
    unit: 'Numbers',
    unitIndex: 1,
    title: 'Count with me!',
    emoji: '🔢',
    concept: `You can print lots of things one after another — just use multiple **print()** lines!\n\nEach print goes on its own line.`,
    example: `print(1)\nprint(2)\nprint(3)`,
    challenge: `Count from **1 to 5** — print each number on its own line!`,
    starterCode: `print(1)\nprint(2)\nprint(___)\nprint(___)\nprint(___)`,
    solutionCode: `print(1)\nprint(2)\nprint(3)\nprint(4)\nprint(5)`,
    checkOutput: (o) => ['1','2','3','4','5'].every(n => o.includes(n)),
    expectedHint: '1 2 3 4 5 (each on its own line)',
    hints: [
      'Fill in the missing numbers: 3, 4, 5',
      'Each print() goes on a new line',
    ],
  },
  {
    id: 'exp-3-1',
    tier: 'EXPLORER',
    unit: 'Repeat',
    unitIndex: 0,
    title: 'Say it 3 times!',
    emoji: '🔁',
    concept: `What if you want to say the same thing lots of times? You could write print() over and over... or use a **loop**!\n\nA loop repeats code for you:\n\n\`for i in range(3):\n    print("Woof!")\`\n\nThis prints "Woof!" **3 times**. The number in range() controls how many times!`,
    example: `for i in range(3):\n    print("Hello!")`,
    challenge: `Make the computer print **"I love coding!"** exactly **5 times** using a loop!`,
    starterCode: `for i in range(___):\n    print("I love coding!")`,
    solutionCode: `for i in range(5):\n    print("I love coding!")`,
    checkOutput: (o) => o.split('\n').filter(l => l.includes('I love coding')).length === 5,
    expectedHint: 'I love coding! (printed 5 times)',
    hints: [
      'Change the ___ to the number of times you want to repeat',
      'You want it 5 times, so put 5 in range()',
      'Try: for i in range(5):',
    ],
  },
]

// ── BUILDER (8–11): Real Python concepts ────────────────────────────────────

const BUILDER_LESSONS: Lesson[] = [
  {
    id: 'bld-1-1',
    tier: 'BUILDER',
    unit: 'Variables',
    unitIndex: 0,
    title: 'Store information in a variable',
    emoji: '📦',
    concept: `A **variable** is like a labelled box that stores a value. You name it, then put something in it using \`=\`.\n\n\`\`\`python\nname = "Max"\nage = 10\nprint(name)\nprint(age)\n\`\`\`\n\nYou can use the variable later just by writing its name — no speech marks needed!`,
    example: `animal = "elephant"\nweight = 6000\nprint(animal)\nprint(weight)`,
    challenge: `Create two variables:\n- \`city\` set to your favourite city\n- \`population\` set to any number\n\nThen print both variables.`,
    starterCode: `city = "___"\npopulation = ___\nprint(city)\nprint(population)`,
    solutionCode: `city = "London"\npopulation = 9000000\nprint(city)\nprint(population)`,
    checkOutput: (o) => o.trim().split('\n').length >= 2,
    expectedHint: 'Two lines of output — the city name and a number',
    hints: [
      'Replace the first ___ with a city name in speech marks',
      'Replace the second ___ with a number (no speech marks for numbers)',
      'Make sure you have both print() lines',
    ],
  },
  {
    id: 'bld-1-2',
    tier: 'BUILDER',
    unit: 'Variables',
    unitIndex: 1,
    title: 'Do maths with variables',
    emoji: '🧮',
    concept: `Variables can hold numbers — and you can do maths with them!\n\n\`\`\`python\nlength = 8\nwidth = 5\narea = length * width\nprint("Area:", area)\n\`\`\`\n\nThe \`*\` symbol means multiply. \`+\` adds, \`-\` subtracts, \`/\` divides.`,
    example: `speed = 60\ntime = 3\ndistance = speed * time\nprint("Distance:", distance)`,
    challenge: `Calculate the **area of a rectangle**:\n- Set \`length\` to 12\n- Set \`width\` to 7\n- Calculate \`area = length * width\`\n- Print: \`"Area:", area\``,
    starterCode: `length = ___\nwidth = ___\narea = length * width\nprint("Area:", area)`,
    solutionCode: `length = 12\nwidth = 7\narea = length * width\nprint("Area:", area)`,
    checkOutput: (o) => o.includes('84'),
    expectedHint: 'Area: 84',
    hints: [
      'Set length to 12 and width to 7',
      '12 × 7 = 84',
      'The print line is already done for you',
    ],
  },
  {
    id: 'bld-2-1',
    tier: 'BUILDER',
    unit: 'If / Else',
    unitIndex: 0,
    title: 'Make decisions with if',
    emoji: '🤔',
    concept: `Programs can make decisions using **if / else**:\n\n\`\`\`python\ntemperature = 35\nif temperature > 30:\n    print("It's hot!")\nelse:\n    print("It's cool.")\n\`\`\`\n\nIf the condition is true, the indented code runs. Otherwise the \`else\` block runs.\n\n⚠️ The indentation (spaces) matters in Python!`,
    example: `score = 85\nif score >= 50:\n    print("You passed!")\nelse:\n    print("Try again!")`,
    challenge: `Write a program that checks if a number is **even or odd**:\n- Set \`number\` to 7\n- If \`number % 2 == 0\`, print \`"Even"\`\n- Otherwise print \`"Odd"\`\n\n*(The % symbol gives the remainder after dividing)*`,
    starterCode: `number = 7\nif number % 2 == ___:\n    print("Even")\nelse:\n    print("Odd")`,
    solutionCode: `number = 7\nif number % 2 == 0:\n    print("Even")\nelse:\n    print("Odd")`,
    checkOutput: (o) => o.trim() === 'Odd',
    expectedHint: 'Odd',
    hints: [
      'The remainder when 7 is divided by 2 is 1, not 0 — so it\'s odd',
      'Replace ___ with 0 (we check if remainder equals zero for even numbers)',
      '7 % 2 equals 1, which is not 0, so the else runs',
    ],
  },
  {
    id: 'bld-3-1',
    tier: 'BUILDER',
    unit: 'Loops',
    unitIndex: 0,
    title: 'Loop through a list',
    emoji: '🔄',
    concept: `A **list** stores multiple values:\n\n\`\`\`python\nanimals = ["cat", "dog", "elephant"]\n\`\`\`\n\nYou can loop through every item with **for...in**:\n\n\`\`\`python\nfor animal in animals:\n    print(animal)\n\`\`\`\n\nThis prints each animal one at a time!`,
    example: `colours = ["red", "green", "blue"]\nfor colour in colours:\n    print("I see", colour)`,
    challenge: `Create a list called \`planets\` with at least 3 planets.\nLoop through it and print each one with: \`"Planet:", planet\``,
    starterCode: `planets = ["Mercury", "Venus", "___"]\nfor planet in planets:\n    print("Planet:", ___)`,
    solutionCode: `planets = ["Mercury", "Venus", "Earth"]\nfor planet in planets:\n    print("Planet:", planet)`,
    checkOutput: (o) => o.includes('Planet:') && o.trim().split('\n').length >= 3,
    expectedHint: 'Planet: Mercury\nPlanet: Venus\nPlanet: ...',
    hints: [
      'Add a third planet name in speech marks where ___ is',
      'In the print line, replace ___ with the loop variable: planet',
    ],
  },
  {
    id: 'bld-4-1',
    tier: 'BUILDER',
    unit: 'Functions',
    unitIndex: 0,
    title: 'Build your own function',
    emoji: '⚙️',
    concept: `A **function** is a named block of code you can run whenever you need it.\n\n\`\`\`python\ndef greet(name):\n    print("Hello,", name)\n\ngreet("Alice")\ngreet("Bob")\n\`\`\`\n\n\`def\` defines the function. The **parameter** (name) is the input. You **call** it by writing its name with brackets.`,
    example: `def double(number):\n    print(number * 2)\n\ndouble(5)\ndouble(10)`,
    challenge: `Write a function called \`square\` that takes a number and prints it multiplied by itself.\n\nThen call it with **4** and **9**.`,
    starterCode: `def square(number):\n    print(number ___ number)\n\nsquare(4)\nsquare(9)`,
    solutionCode: `def square(number):\n    print(number * number)\n\nsquare(4)\nsquare(9)`,
    checkOutput: (o) => o.includes('16') && o.includes('81'),
    expectedHint: '16\n81',
    hints: [
      'Replace ___ with the multiplication operator: *',
      '4 * 4 = 16, 9 * 9 = 81',
    ],
  },
]

// ── CREATOR (12–15): Real Python, more complex ───────────────────────────────

const CREATOR_LESSONS: Lesson[] = [
  {
    id: 'crt-1-1',
    tier: 'CREATOR',
    unit: 'Data Structures',
    unitIndex: 0,
    title: 'Lists and indexing',
    emoji: '📋',
    concept: `**Lists** are ordered collections. Items are accessed by their **index** — starting at 0.\n\n\`\`\`python\nfruits = ["apple", "banana", "cherry"]\nprint(fruits[0])   # apple\nprint(fruits[2])   # cherry\nprint(len(fruits)) # 3\n\`\`\`\n\nYou can **append**, **remove**, and **slice** lists:\n\`\`\`python\nfruits.append("mango")\nfruits.remove("banana")\nprint(fruits[1:3])  # slice: index 1 up to (not including) 3\n\`\`\``,
    example: `scores = [95, 72, 88, 61, 79]\nprint("First:", scores[0])\nprint("Last:", scores[-1])\nprint("Top 3:", scores[:3])`,
    challenge: `Given this list of temperatures:\n\`temps = [22, 35, 18, 41, 27, 15, 33]\`\n\nPrint:\n1. The hottest temperature (index 3)\n2. The number of readings (use len())\n3. The first 3 readings (use a slice)`,
    starterCode: `temps = [22, 35, 18, 41, 27, 15, 33]\n\nprint("Hottest:", temps[___])\nprint("Total readings:", ___(temps))\nprint("First 3:", temps[___:___])`,
    solutionCode: `temps = [22, 35, 18, 41, 27, 15, 33]\n\nprint("Hottest:", temps[3])\nprint("Total readings:", len(temps))\nprint("First 3:", temps[0:3])`,
    checkOutput: (o) => o.includes('41') && o.includes('7') && o.includes('22'),
    expectedHint: 'Hottest: 41\nTotal readings: 7\nFirst 3: [22, 35, 18]',
    hints: [
      'The hottest is at index 3 (remember: counting starts at 0)',
      'len() counts how many items are in a list',
      'A slice from 0 to 3 gives the first 3 items: [0:3]',
    ],
  },
  {
    id: 'crt-2-1',
    tier: 'CREATOR',
    unit: 'Dictionaries',
    unitIndex: 0,
    title: 'Key-value pairs',
    emoji: '🗂️',
    concept: `A **dictionary** stores data as key-value pairs — like a real dictionary where you look up a word to get its meaning.\n\n\`\`\`python\nperson = {\n    "name": "Ada Lovelace",\n    "born": 1815,\n    "field": "Mathematics"\n}\nprint(person["name"])\nprint(person["born"])\n\`\`\`\n\nAccess values with \`dict["key"]\`. Add or update: \`dict["key"] = value\`.`,
    example: `planet = {"name": "Mars", "moons": 2, "distance_km": 225000000}\nprint(planet["name"], "has", planet["moons"], "moons")\nplanet["explored"] = True\nprint("Explored:", planet["explored"])`,
    challenge: `Create a dictionary called \`book\` with keys:\n- \`"title"\` — any book title\n- \`"author"\` — the author's name  \n- \`"year"\` — year published\n- \`"pages"\` — number of pages\n\nThen print a summary: \`"Title by Author (year) — pages pages"\``,
    starterCode: `book = {\n    "title": "___",\n    "author": "___",\n    "year": ___,\n    "pages": ___\n}\n\nprint(book["title"], "by", book["___"], "("+str(book["year"])+")", "—", book["pages"], "pages")`,
    solutionCode: `book = {\n    "title": "Harry Potter",\n    "author": "J.K. Rowling",\n    "year": 1997,\n    "pages": 223\n}\n\nprint(book["title"], "by", book["author"], "("+str(book["year"])+")", "—", book["pages"], "pages")`,
    checkOutput: (o) => o.includes('by') && o.includes('—'),
    expectedHint: '[Title] by [Author] (year) — pages pages',
    hints: [
      'Fill in the four string/number values in the dictionary',
      'In the print line, replace ___ with "author"',
      'str() converts the year number to a string so it can join with text',
    ],
  },
  {
    id: 'crt-3-1',
    tier: 'CREATOR',
    unit: 'Functions',
    unitIndex: 0,
    title: 'Functions with return values',
    emoji: '↩️',
    concept: `Functions can **return** a value instead of just printing it. This lets you use the result elsewhere.\n\n\`\`\`python\ndef celsius_to_fahrenheit(c):\n    return (c * 9/5) + 32\n\ntemp = celsius_to_fahrenheit(100)\nprint(temp)  # 212.0\n\`\`\`\n\nUsing \`return\` makes functions reusable and composable — the output can feed into other calculations.`,
    example: `def area_of_circle(radius):\n    pi = 3.14159\n    return pi * radius * radius\n\nsmall = area_of_circle(5)\nlarge = area_of_circle(10)\nprint("Small circle area:", round(small, 2))\nprint("Large circle area:", round(large, 2))`,
    challenge: `Write a function \`bmi(weight_kg, height_m)\` that calculates Body Mass Index:\n\n**BMI = weight / (height × height)**\n\nReturn the result rounded to 1 decimal place using \`round(value, 1)\`.\n\nThen call it with weight=70, height=1.75 and print the result.`,
    starterCode: `def bmi(weight_kg, height_m):\n    result = weight_kg ___ (height_m ___ height_m)\n    return round(result, 1)\n\nmy_bmi = bmi(___, ___)\nprint("BMI:", my_bmi)`,
    solutionCode: `def bmi(weight_kg, height_m):\n    result = weight_kg / (height_m * height_m)\n    return round(result, 1)\n\nmy_bmi = bmi(70, 1.75)\nprint("BMI:", my_bmi)`,
    checkOutput: (o) => o.includes('22.9') || o.includes('22.857'),
    expectedHint: 'BMI: 22.9',
    hints: [
      'BMI divides weight by height squared: weight / (height * height)',
      'Use / for division and * for multiplication',
      'Call bmi(70, 1.75) — the result should be 22.9',
    ],
  },
  {
    id: 'crt-4-1',
    tier: 'CREATOR',
    unit: 'Loops & Logic',
    unitIndex: 0,
    title: 'FizzBuzz — the classic challenge',
    emoji: '🎯',
    concept: `**FizzBuzz** is a famous programming interview problem. Here's the challenge:\n\nFor numbers 1 to 20:\n- If divisible by 3, print \`"Fizz"\`\n- If divisible by 5, print \`"Buzz"\`  \n- If divisible by both 3 and 5, print \`"FizzBuzz"\`\n- Otherwise, print the number\n\nKey tools: \`range()\`, \`if/elif/else\`, \`%\` (modulo operator)`,
    example: `for i in range(1, 6):\n    if i % 2 == 0:\n        print("Even")\n    else:\n        print(i)`,
    challenge: `Implement FizzBuzz for numbers **1 to 20**.\n\nRemember: check for FizzBuzz (both) **first**, then Fizz, then Buzz, then the number.`,
    starterCode: `for i in range(1, 21):\n    if i % 3 == 0 and i % 5 == ___:\n        print("FizzBuzz")\n    elif i % ___ == 0:\n        print("Fizz")\n    elif i % 5 == ___:\n        print("Buzz")\n    else:\n        print(___)`,
    solutionCode: `for i in range(1, 21):\n    if i % 3 == 0 and i % 5 == 0:\n        print("FizzBuzz")\n    elif i % 3 == 0:\n        print("Fizz")\n    elif i % 5 == 0:\n        print("Buzz")\n    else:\n        print(i)`,
    checkOutput: (o) => o.includes('FizzBuzz') && o.includes('Fizz') && o.includes('Buzz') && o.includes('1\n'),
    expectedHint: '1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz...',
    hints: [
      'The first blank in the FizzBuzz check should be 0 (divisible by 5)',
      'The second blank (elif) should be 3 — checking divisible by 3',
      'The third blank should be 0 — checking divisible by 5',
      'The final blank should be i — print the number itself',
    ],
  },
]

export const ALL_LESSONS: Lesson[] = [
  ...EXPLORER_LESSONS,
  ...BUILDER_LESSONS,
  ...CREATOR_LESSONS,
]

export function getLessonsForTier(tier: LessonTier): Lesson[] {
  return ALL_LESSONS.filter((l) => l.tier === tier)
}

export function getLessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id)
}

export function getUnitsForTier(tier: LessonTier): string[] {
  const lessons = getLessonsForTier(tier)
  return [...new Set(lessons.map((l) => l.unit))]
}
