const model = "gpt-4o-mini"
const modelApiUrl = "https://api.openai.com/v1/chat/completions"
const modelProvider = "OpenAI"

const numericButtons = {
	b0: 0,
	b1: 1,
	b2: 2,
	b3: 3,
	b4: 4,
	b5: 5,
	b6: 6,
	b7: 7,
	b8: 8,
	b9: 9,
}

const functionalButtons = {
	add: () => setOperation("+"),
	sub: () => setOperation("−"),
	mul: () => setOperation("×"),
	div: () => setOperation("÷"),
	comma: addComma,
	enter: calculate,
	clear: clearLCD,
}

let lcd
let keyBoard
let errorVisible = false

function init() {
	/**
	 * Defer API key retrieval by two render frames so blocking operations (e.g.
	 * `prompt()`) don't interfere with the browser's initial paint and layout
	 * stabilization.
	 */
	requestAnimationFrame(() => {
		requestAnimationFrame(() => getModelApiKey())
	})

	lcd = document.getElementById("lcd")
	keyBoard = document.getElementById("keyBoard")
	keyBoard.addEventListener("click", buttonClick)
	document.addEventListener("keydown", onKeyDown)

	errorVisible = false
}

function buttonClick(e) {
	const button = e.target.id
	if (!button) return

	if (errorVisible) {
		clearLCD()
		errorVisible = false
	}

	if (Object.hasOwn(numericButtons, button)) addDigit(numericButtons[button])
	else if (Object.hasOwn(functionalButtons, button)) functionalButtons[button]()
	else console.error(`Unknown button: ${button}`)
}

function onKeyDown(e) {
	if (e.key === "Backspace") {
		e.preventDefault()
		lcd.value = lcd.value.slice(0, -1)
	}
}

function addDigit(digit) {
	lcd.value += digit
}

function setOperation(operation) {
	const isEmpty = lcd.value.length === 0
	const endsWithComma = /,$/.test(lcd.value)
	const endsWithOperator = /[+−×÷]$/.test(lcd.value)

	if (isEmpty) return

	if (endsWithComma || endsWithOperator) {
		clearLastLCDEntry()
	}

	lcd.value += operation
}

function addComma() {
	const isEmpty = lcd.value.trim().length === 0
	const endsWithOperator = /[+−×÷]$/.test(lcd.value)
	const commaInCurrentMember = /\d+,\d*$/.test(lcd.value)
	// If LCD is empty or ends with an operator, prepend a zero before the comma
	if (isEmpty || endsWithOperator) {
		lcd.value += "0,"
	}

	// Only add a comma if there isn't one already in the current number
	else if (!commaInCurrentMember) {
		lcd.value += ","
	}
}

async function calculate() {
	const isEmpty = lcd.value.trim().length === 0
	const endsWithComma = /,$/.test(lcd.value)
	const endsWithOperator = /[+−×÷]$/.test(lcd.value)

	if (isEmpty) return

	if (endsWithComma || endsWithOperator) {
		clearLastLCDEntry()
	}

	const expression = lcd.value
		.replace(/,/g, ".")
		.replace(/×/g, "*")
		.replace(/÷/g, "/")
		.replace(/−/g, "-")

	const response = await fetch(modelApiUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${getModelApiKey()}`,
		},
		body: JSON.stringify({
			model: model,
			messages: [
				{
					role: "user",
					content: `ANSWER ONLY WITH THE RESULT OR A DESCRIPTIVE ERROR IF THE EXPRESSION IS INVALID. USE COMMAS INSTEAD OF PERIODS. Evaluate the following mathematical expression or number: ${expression}`,
				},
			],
		}),
	})

	if (!response.ok) {
		lcd.value = `Error: ${response.status}`
		errorVisible = true
		return
	}

	const data = await response.json()
	lcd.value = data.choices[0].message.content.trim()
}

function clearLCD() {
	lcd.value = ""
}

function clearLastLCDEntry() {
	lcd.value = lcd.value.slice(0, -1)
}

function getModelApiKey() {
	const localStorageKey = "modelApiKey"

	const storedKey = localStorage.getItem(localStorageKey)
	if (storedKey) return storedKey

	const inputKey = prompt(
		`Enter your ${modelProvider} API key. This is required to use the calculator.`,
	)
	if (!inputKey) {
		alert(
			`An ${modelProvider} API key is required to use the calculator! Functionality will be limited.`,
		)
		return
	}

	localStorage.setItem(localStorageKey, inputKey)
	return inputKey
}

window.onload = init
