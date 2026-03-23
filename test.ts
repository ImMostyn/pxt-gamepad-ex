// Smoke tests for gamepad extension - validates core functionality without crashing

// Test 1: Broadcast functionality
basic.showString("B")  // Show B for Broadcast test in progress
Gamepadex.startBroadcast(1, Frequencies.TwoFiftyHz)
basic.pause(100)
Gamepadex.stopBroadcast()
basic.clearScreen()

// Test 2: Receiver functionality
basic.showString("R")  // Show R for Receiver test in progress
Gamepadex.startReceiving(1)
basic.pause(100)

// Test 3: Status functions
let status = Gamepadex.gamepadStatus()
let x = Gamepadex.joystickX()
let y = Gamepadex.joystickY()
let mode = Gamepadex.operatingMode()

// Test 4: Query functions
let buttonPressed = Gamepadex.isPressed(ButtonFlag.AButton)
let oriented = Gamepadex.isOrientated(GestureFlags.Shake)

// Test 5: Configuration functions
Gamepadex.setDoubleClickWindow(250)
Gamepadex.setJoystickDeadzone(5)
Gamepadex.setDebugMode(false)

// Test 6: Event handlers (registration only, no execution needed)
Gamepadex.onGamepadButtonPressed(ButtonFlag.AButton, function() {
    basic.showString("P")
})

Gamepadex.onGamepadButtonReleased(ButtonFlag.AButton, function() {
    basic.showString("R")
})

Gamepadex.onGamepadButtonClicked(ButtonFlag.AButton, function() {
    basic.showString("C")
})

Gamepadex.onGamepadButtonDoubleClicked(ButtonFlag.AButton, function() {
    basic.showString("D")
})

Gamepadex.stopReceiving()
basic.clearScreen()

// Test 7: Local button reading
let localPressed = Gamepadex.isPressedLocal(ButtonFlag.AButton)
let packedState = Gamepadex.packedGamepadState()

basic.showString("OK")  // All tests passed
