# Gamepad Extension for micro:bit

A powerful extension to add wireless gamepad/controller support to your micro:bit projects. Transmit and receive gamepad input including button states, joystick positions, and device orientation over the micro:bit radio.

## Features

- **Wireless Button Input** — Read button presses from remote gamepad
- **Joystick Support** — X/Y analog stick position (0-255 range, 128=center)
- **Event-Driven Architecture** — Four event types: pressed, released, clicked, double-clicked
- **Smart Click Detection** — Distinguishes between quick clicks and long holds
- **Orientation/Gestures** — Read shake, tilt, and acceleration events
- **Configurable** — Adjust double-click window and joystick deadzone at runtime
- **Low Latency** — Supports frequencies up to 500Hz for responsive gameplay

## Hardware Setup

### Supported Gamepads
- **DFRobot Gamepad for micro:bit v4.0** ([Wiki](https://wiki.dfrobot.com/dfr0536/#tech_specs))
- **ELECFREAKS joystick:bit** ([Product Page](https://www.elecfreaks.com/estore/elecfreaks-joystick-bit-for-micro-bit.html))

### Pin Configuration by Type

| Component      | DFRobot Gamepad | joystick:bit |
|---------------|:---------------:|:------------:|
| Joystick X    | P1 (Analog)     | P1 (Analog)  |
| Joystick Y    | P2 (Analog)     | P2 (Analog)  |
| Green Button  | P13             | P12          |
| Yellow Button | P14             | P13          |
| Red Button    | P15             | P14          |
| Blue Button   | P16             | P15          |
| Stick Button  | P8              | ✖️           |
| Button.A      | Onboard         | Onboard      |
| Button.B      | Onboard         | Onboard      |
| Logo Button   | Onboard         | Onboard      |

- For **DFRobot Gamepad**, button pins are P13–P16 and stick button is P8.
- For **joystick:bit**, button pins are P12–P15 (no stick button).
- Joystick axes (X/Y) are always on P1/P2 for both types.
- Onboard micro:bit buttons (A, B, Logo) are always available.

---

## Installation

1. Open [https://makecode.microbit.org/](https://makecode.microbit.org/)
2. Create a **New Project**
3. Click the **Extensions** button (gear icon)
4. Search for `https://github.com/immostyn/pxt-gamepad-ex`
5. Select and import the extension

## Quick Start Examples

### Basic Broadcasting (Gamepad sends data)

```javascript
// Initialize the gamepad broadcaster
Gamepadex.startBroadcast(1, Frequencies.TwoFiftyHz)

// Show LED when A button is pressed locally
input.onButtonPressed(Button.A, function () {
    led.plot(0, 0)
})

// Stop broadcasting
Gamepadex.stopBroadcast()
```

### Basic Receiving (micro:bit receives gamepad data)

```javascript
// Start listening for gamepad messages
Gamepadex.startReceiving(1)

// React to remote button press
Gamepadex.onGamepadButtonPressed(ButtonFlag.AButton, function () {
    basic.showString("A!")
})

// React to button click (brief press/release)
Gamepadex.onGamepadButtonClicked(ButtonFlag.AButton, function () {
    basic.showString("Click")
})

// React to double-click
Gamepadex.onGamepadButtonDoubleClicked(ButtonFlag.AButton, function () {
    basic.showString("Double")
})

// Stop receiving
Gamepadex.stopReceiving()
```

### Reading Joystick Input

```javascript
Gamepadex.startReceiving(1)

// Read joystick position (0-255, 128=center)
let x = Gamepadex.joystickX()
let y = Gamepadex.joystickY()

// Check if button is currently pressed
if (Gamepadex.isPressed(ButtonFlag.GreenButton)) {
    basic.showNumber(x)
}
```

### Configuration

```javascript
// Set double-click time window (100-1000ms, default 300ms)
Gamepadex.setDoubleClickWindow(250)

// Adjust joystick deadzone (0-20, default 4)
Gamepadex.setJoystickDeadzone(5)

// Enable debug output to serial port
Gamepadex.setDebugMode(true)
```

## Gamepad Type Configuration

This extension supports multiple hardware types. You must configure the gamepad type before broadcasting or reading input:

### Supported Types
- **DFRobot Gamepad** (default)
- **ELECFREAKS joystick:bit**

### Selecting the Gamepad Type

Call this function at the start of your program:

```javascript
// For DFRobot Gamepad (default, no need to call unless switching)
Gamepadex.setGamepadType(GamepadType.DFRobot)

// For ELECFREAKS joystick:bit
Gamepadex.setGamepadType(GamepadType.JoystickBit)
```

### Capabilities by Type

| Feature         | DFRobot Gamepad | joystick:bit |
|-----------------|:---------------:|:------------:|
| Button.A        |       ✔️        |      ✔️      |
| Button.B        |       ✔️        |      ✔️      |
| Logo Button     |       ✔️        |      ✔️      |
| Green Button    |       ✔️        |      ✔️      |
| Yellow Button   |       ✔️        |      ✔️      |
| Red Button      |       ✔️        |      ✔️      |
| Blue Button     |       ✔️        |      ✔️      |
| Stick Button    |       ✔️        |      ✖️      |
| Joystick X/Y    |       ✔️        |      ✔️      |

- On **joystick:bit**, Button.A, Button.B, and Logo are always available from the onboard micro:bit.
- The Stick Button is only available on the DFRobot Gamepad.
- All other buttons and joystick axes are mapped to the corresponding pins for each hardware type.

### Pin Initialization

The extension automatically configures the correct pins for the selected hardware type. No additional setup is required.

## API Reference

### Sender Functions

**`startBroadcast(radioGroup?: number, frequency?: Frequencies)`**
- Start broadcasting gamepad status
- Parameters: `radioGroup` (1-255, default: 1), `frequency` (default: 250Hz)

**`stopBroadcast()`**
- Stop broadcasting gamepad data

**`isPressedLocal(button: ButtonFlag): boolean`**
- Check if button is pressed on this micro:bit's gamepad

**`packedGamepadState(): uint32`**
- Get raw packed gamepad state (advanced use)

### Receiver Functions

**`startReceiving(radioGroup?: number)`**
- Begin listening for gamepad messages on specified radio group

**`stopReceiving()`**
- Stop receiving gamepad messages

**`joystickX(): number`**
- Get current X position of joystick (0-255, 128=center)

**`joystickY(): number`**
- Get current Y position of joystick (0-255, 128=center)

**`isPressed(button: ButtonFlag): boolean`**
- Check if specified button is currently pressed on remote gamepad

**`isOrientated(gesture: GestureFlags): boolean`**
- Check if remote device is currently oriented/gesturing

**`gamepadStatus(): uint32`**
- Get raw packed gamepad state (advanced use)

### Event Handlers

**`onGamepadButtonPressed(button: ButtonFlag, handler: () => void)`**
- Fires immediately when button transitions from released to pressed

**`onGamepadButtonReleased(button: ButtonFlag, handler: () => void)`**
- Fires immediately when button transitions from pressed to released

**`onGamepadButtonClicked(button: ButtonFlag, handler: () => void)`**
- Fires when button is briefly pressed and released (single click)
- Only fires if press duration < 300ms AND no double-click follows

**`onGamepadButtonDoubleClicked(button: ButtonFlag, handler: () => void)`**
- Fires when button is clicked twice within 300ms window

### Configuration Functions

**`setDoubleClickWindow(ms: number)`**
- Adjust double-click detection time window (100-1000ms, default: 300ms)

**`setJoystickDeadzone(value: number)`**
- Set joystick deadzone threshold (0-20, default: 4)

**`setDebugMode(enabled: boolean)`**
- Enable/disable debug output to serial console

## Architecture

### Data Format

Gamepad data is packed into a single 32-bit integer for efficient transmission:

- **Bits 0-7**: Button flags (A, B, Logo, Green, Yellow, Red, Blue, Stick)
- **Bits 8-15**: Joystick X position (0-255, 128=center)
- **Bits 16-23**: Joystick Y position (0-255, 128=center)
- **Bits 24-31**: Orientation/Gesture flags (Shake, Tilt, etc.)

### Event Processing

1. **Radio Message Arrives** → `radio.onReceivedNumber()` callback updates `_gamepadStatus`
2. **Background Click Detector** (runs every 5ms) → Analyzes button transitions
3. **State Transitions** → Raises appropriate events (pressed, released, clicked, double-clicked)

### Single Radio Handler

The extension uses a singleton pattern for the radio receiver to prevent multiple registrations. Only one `radio.onReceivedNumber()` handler is registered regardless of how many times `startReceiving()` is called.

## Troubleshooting

### No messages received
- Ensure both micro:bits are on the **same radio group** (1-255)
- Check that broadcaster called `startBroadcast()` and receiver called `startReceiving()`
- Verify radio antenna signal strength (avoid metal objects nearby)
- Check serial console output with `setDebugMode(true)`

### Buttons not responding
- Verify pins P8, P13-P16 are available
- Check gamepad hardware connections
- Try `setDebugMode(true)` to see incoming data

### Double-click not working
- Adjust time window with `setDoubleClickWindow()`
- Default is 300ms; try shorter window if presses are too quick
- Ensure both clicks are brief (< 300ms hold time)

### Joystick values jumping around
- Increase deadzone with `setJoystickDeadzone()` (default: 4)
- Higher values = larger center "dead zone" = more stable values

## Version History

- **1.0.0** (2026-03-23) — Initial production release
  - Fixed radio handler registration (singleton pattern)
  - Added parameter validation
  - Pin configuration error handling
  - Runtime configurable click window and deadzone
  - Comprehensive JSDoc documentation
  - Smoke tests included

## License

MIT

## Contributing

Issues and pull requests welcome at [GitHub](https://github.com/immostyn/pxt-gamepad-ex)

---

> Edit this project at [https://makecode.microbit.org/](https://makecode.microbit.org/)

<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
