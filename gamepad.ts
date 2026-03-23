/**
* Gamepad extension
* Intended for DFRobot Gamepad to send joystick positions, 
* button states and orientation flags packed in 4 bytes of a 32 bit integer.
* All at a high frequency for a listening micro:bit to be able to consume
*/

enum OperatingMode {
    NotConfigured,
    Gamepad,
    Receiver,
    GamepadAndReceiver
}

enum Frequencies {
    //% block="Slow (125 Hz)"
    OneTwentyFiveHz = 8,
    //% block="Med (167 Hz)"
    OneSixtySevenHz = 6,
    //% block="Fast (250 Hz)"
    TwoFiftyHz = 4,
    //% block="Superfly (500 Hz)"
    FiveHundredHz =2,
    //% block="Debug (2 Hz)"
    Debug = 500
}

enum ButtonFlag {
    //% block="A"
    AButton = 0x01,
    //% block="B"
    BButton = 0x02,
    //% block="Logo"
    Logo = 0x04,
    //% block="Green Button"
    GreenButton = 0x08,
    //% block="Yellow Button"
    YellowButton = 0x10,
    //% block="Red Button"
    RedButton = 0x20,
    //% block="Blue Button"
    BlueButton = 0x40,
    //% block="Stick Button"
    StickButton = 0x80
}

enum GestureFlags {
    //% block="Shake"
    Shake = 0x01000000,
    //% block="Logo Up"
    LogoUp = 0x02000000,
    //% block="Logo Down"
    LogoDown = 0x04000000,
    //% block="Screen Up"
    ScreenUp = 0x08000000,
    //% block="Screen Down"
    ScreenDown = 0x10000000,
    //% block="Tilt Left"
    TiltLeft = 0x20000000,
    //% block="Tilt Right"
    TiltRight = 0x40000000,
    //% block="Falling"
    Falling = 0x80000000
}

enum ComponentMasks {
    Buttons = 0x000000FF,
    HorizontalStick = 0x0000FF00,
    VerticalStick = 0x00FF0000,
    Orientation = 0xFF000000
}

enum BytePositions {
    Buttons = 0,
    HorizontalStick = 8,
    VerticalStick = 16,
    Orientation = 24
}

/**
 * Gamepad methods
 * This version is configured to support the DFRobot Gamepad for micro:bit v4.0
 * https://wiki.dfrobot.com/dfr0536/#tech_specs
 * 
 * Gamepad data is packed into a 32-bit integer:
 * - Bits 0-7:   Button flags
 * - Bits 8-15:  Joystick X (0-255, 128=center)
 * - Bits 16-23: Joystick Y (0-255, 128=center)
 * - Bits 24-31: Orientation/Gesture flags
 */
//% weight=100 color=#ff8000 icon="\uf11b" block="Gamepad"
namespace Gamepadex {

    // Pin configuration constants for easy maintenance
    const PIN_CONFIG = {
        STICK_BUTTON: DigitalPin.P8,
        GREEN_BUTTON: DigitalPin.P13,
        YELLOW_BUTTON: DigitalPin.P14,
        RED_BUTTON: DigitalPin.P15,
        BLUE_BUTTON: DigitalPin.P16,
        JOYSTICK_X: AnalogReadWritePin.P1,
        JOYSTICK_Y: AnalogReadWritePin.P2
    }

    let isBroadcasting = false
    let isListening = false
    let mode = OperatingMode.NotConfigured
    let _radioHandlerRegistered = false

    let _radioGroup = 1
    let _frequency = Frequencies.TwoFiftyHz

    let _gamepadStatus = 0
    let _lastGamepadStatus = 0

    let _deadzone = 4
    let _doubleClickWindowMs = 300
    let _debugMode = false
    let _hasClickListeners = false

    // Event bus constants for button events
    const GAMEPAD_BUTTON_PRESSED_EVENT_ID = 9800
    const GAMEPAD_BUTTON_RELEASED_EVENT_ID = 9801
    const GAMEPAD_BUTTON_CLICKED_EVENT_ID = 9802
    const GAMEPAD_BUTTON_DOUBLECLICKED_EVENT_ID = 9803

    // Double-click configuration
    const DOUBLE_CLICK_WINDOW_MS = 300

    // Per-button tracking for click/double-click detection
    let _lastPressTime: number[] = [0, 0, 0, 0, 0, 0, 0, 0]
    let _lastReleaseTime: number[] = [0, 0, 0, 0, 0, 0, 0, 0]
    let _clickCount: number[] = [0, 0, 0, 0, 0, 0, 0, 0]
    let _pendingClickTime: number[] = [0, 0, 0, 0, 0, 0, 0, 0]
    let _clickDetectorRunning = false

    /**
     * Broadcast Gamepad status at specified frequency
     * 
     * @param radioGroup - Radio group (1-255), defaults to 1
     * @param frequency - Broadcast frequency, defaults to 250Hz
     * 
     * @example
     * Gamepadex.startBroadcast(1, Frequencies.TwoFiftyHz)
     */
    //% block="Broadcast Gamepad | on radio group $radioGroup | at $frequency"
    //% radioGroup.defl=1 radioGroup.min = 1 radioGroup.max = 255
    //% frequency.defl=Frequencies.TwoFiftyHz
    //% group="Sender"
    export function startBroadcast(radioGroup?: number, frequency?: Frequencies): void {
        if (isBroadcasting) return

        // Validate parameters
        if (radioGroup !== undefined && (radioGroup < 1 || radioGroup > 255)) {
            radioGroup = 1  // Fall back to default
        }

        if (mode == OperatingMode.NotConfigured || mode == OperatingMode.Receiver) {
            _radioGroup = radioGroup
            _frequency = frequency

            radio.setGroup(_radioGroup)

            try {
                // Attempt to set pull mode for all pins, in case some don't exist on certain micro:bit versions
                pins.setPull(PIN_CONFIG.STICK_BUTTON, PinPullMode.PullNone)
                pins.setPull(PIN_CONFIG.GREEN_BUTTON, PinPullMode.PullNone)
                pins.setPull(PIN_CONFIG.YELLOW_BUTTON, PinPullMode.PullNone)
                pins.setPull(PIN_CONFIG.RED_BUTTON, PinPullMode.PullNone)
                pins.setPull(PIN_CONFIG.BLUE_BUTTON, PinPullMode.PullNone)
            } catch (e) {
                // Pin configuration failed - may already be in use
                if (_debugMode) {
                    basic.showString("Pin error")
                }
                return
            }
        }

        isBroadcasting = true

        // Update mode based on current state
        if (isListening) {
            mode = OperatingMode.GamepadAndReceiver
        } else {
            mode = OperatingMode.Gamepad
        }

        control.inBackground(() => {
            while (isBroadcasting) {
                //console.log(getGamepadState())
                radio.sendNumber(packedGamepadState())
                basic.pause(_frequency)
            }
        })
    }

    /**
     * Stop broadcasting the Gamepad status
     * 
     * @example
     * Gamepadex.stopBroadcast()
     */
    //% block="Stop Broadcast Gamepad"
    //% group="Sender"
    export function stopBroadcast(): void {
        isBroadcasting = false
        
        // Update mode
        if (isListening) {
            mode = OperatingMode.Receiver
        } else {
            mode = OperatingMode.NotConfigured
        }
    }

    /**
     * Receive Gamepad status messages on the specified radio group.
     * Only one instance of the radio handler is registered (singleton pattern).
     * 
     * @param radioGroup - Radio group (1-255), defaults to 1
     * @example
     * Gamepadex.startReceiving(1)
     */
    //% block="Receive Gamepad status | on group $radioGroup"
    //% radioGroup.defl=1 radioGroup.min = 1 radioGroup.max = 255
    //% group="Receiver"
    export function startReceiving(radioGroup?: number): void {
        if (isListening) return

        // Validate radio group parameter
        if (radioGroup !== undefined && (radioGroup < 1 || radioGroup > 255)) {
            radioGroup = 1  // Fall back to default
        }

        if (mode == OperatingMode.NotConfigured || mode == OperatingMode.Gamepad) {
            _radioGroup = radioGroup

            radio.setGroup(_radioGroup)
        }

        isListening = true

        // Update mode based on current state
        if (isBroadcasting) {
            mode = OperatingMode.GamepadAndReceiver
        } else {
            mode = OperatingMode.Receiver
        }

        // Register radio handler only once (singleton pattern)
        if (!_radioHandlerRegistered) {
            radio.onReceivedNumber(function (receivedNumber: number){
                if (_debugMode) {
                    serial.writeLine("Ack: " + receivedNumber)
                }
                _gamepadStatus = receivedNumber
                
                // Start click detector if listeners are registered
                if (_hasClickListeners && !_clickDetectorRunning) {
                    startClickDetector()
                }
            })
            _radioHandlerRegistered = true
        }
    }

    /**
     * Stop receiving Gamepad status messages
     * 
     * @example
     * Gamepadex.stopReceiving()
     */
    //% block="Stop Receive Gamepad"
    //% group="Receiver"
    export function stopReceiving(): void {
        isListening = false
        _clickDetectorRunning = false
        
        // Update mode
        if (isBroadcasting) {
            mode = OperatingMode.Gamepad
        } else {
            mode = OperatingMode.NotConfigured
        }
    }

    /**
     * Start the background click detector
     */
    function startClickDetector(): void {
        if (_clickDetectorRunning) return
        _clickDetectorRunning = true
        
        control.inBackground(function() {
            while (_clickDetectorRunning && isListening) {
                processButtonClicks()
                basic.pause(5)  // Check every 5ms
            }
        })
    }

    /**
     * Process button state changes and fire events
     */
    function processButtonClicks(): void {
        const currentTime = control.millis()
        
        // Check for any pending clicks that have expired
        for (let i = 0; i < 8; i++) {
            if (_pendingClickTime[i] > 0 && currentTime >= _pendingClickTime[i]) {
                if (_clickCount[i] === 1) {
                    control.raiseEvent(GAMEPAD_BUTTON_CLICKED_EVENT_ID, 1 << i)
                }
                _pendingClickTime[i] = 0
            }
        }
        
        // Check each button bit to see state transitions
        for (let i = 0; i < 8; i++) {
            const buttonBit = 1 << i
            const wasPressed = !!(_lastGamepadStatus & buttonBit)
            const isNowPressed = !!(_gamepadStatus & buttonBit)
            
            // Detect 0 -> 1 transition (button pressed)
            if (!wasPressed && isNowPressed) {
                _lastPressTime[i] = currentTime
                control.raiseEvent(GAMEPAD_BUTTON_PRESSED_EVENT_ID, buttonBit)
            }
            
            // Detect 1 -> 0 transition (button released)
            if (wasPressed && !isNowPressed) {
                control.raiseEvent(GAMEPAD_BUTTON_RELEASED_EVENT_ID, buttonBit)
                
                // Calculate how long the button was held
                const pressDuration = currentTime - _lastPressTime[i]
                
                // Only consider clicks if held briefly (< 300ms)
                if (pressDuration <= _doubleClickWindowMs) {
                    // Handle click/double-click detection on release
                    const timeSinceLastRelease = currentTime - _lastReleaseTime[i]
                    
                    // Clear any pending click for this button
                    _pendingClickTime[i] = 0
                    
                    if (timeSinceLastRelease <= _doubleClickWindowMs) {
                        // Second release within window - it's a double-click
                        _clickCount[i] = 0
                        _lastReleaseTime[i] = 0
                        control.raiseEvent(GAMEPAD_BUTTON_DOUBLECLICKED_EVENT_ID, buttonBit)
                    } else {
                        // First release in new window - schedule single click event
                        _clickCount[i] = 1
                        _lastReleaseTime[i] = currentTime
                        _pendingClickTime[i] = currentTime + DOUBLE_CLICK_WINDOW_MS
                    }
                }
            }
        }
        
        // Update tracking variable
        _lastGamepadStatus = _gamepadStatus
    }

    /**
     * On Gamepad button clicked (single click on brief press/release)
     * @param button - Button to listen for
     * @param handler - Callback function when clicked
     * 
     * @example
     * Gamepadex.onGamepadButtonClicked(ButtonFlag.AButton, function() {
     *     basic.showString("A clicked")
     * })
     */
    //% block="on Gamepad | $button | clicked"
    //% button.defl=ButtonFlag.GreenButton
    //% group="Receiver"
    //% blockGap=8
    export function onGamepadButtonClicked(button: ButtonFlag, handler: () => void): void {
        if (!_hasClickListeners) {
            _hasClickListeners = true
            if (isListening && !_clickDetectorRunning) {
                startClickDetector()
            }
        }
        control.onEvent(GAMEPAD_BUTTON_CLICKED_EVENT_ID, button, handler)
    }

    /**
     * On Gamepad button pressed (immediate on press, 0→1 transition)
     * @param button - Button to listen for
     * @param handler - Callback function when pressed
     * 
     * @example
     * Gamepadex.onGamepadButtonPressed(ButtonFlag.AButton, function() {
     *     basic.clearScreen()
     * })
     */
    //% block="on Gamepad | $button | pressed"
    //% button.defl=ButtonFlag.GreenButton
    //% group="Receiver"
    //% blockGap=8
    export function onGamepadButtonPressed(button: ButtonFlag, handler: () => void): void {
        control.onEvent(GAMEPAD_BUTTON_PRESSED_EVENT_ID, button, handler)
    }

    /**
     * On Gamepad button released (immediate on release, 1→0 transition)
     * @param button - Button to listen for
     * @param handler - Callback function when released
     */
    //% block="on Gamepad | $button | released"
    //% button.defl=ButtonFlag.GreenButton
    //% group="Receiver"
    //% blockGap=8
    export function onGamepadButtonReleased(button: ButtonFlag, handler: () => void): void {
        control.onEvent(GAMEPAD_BUTTON_RELEASED_EVENT_ID, button, handler)
    }

    /**
     * On Gamepad button double-clicked (two clicks within 300ms window)
     * @param button - Button to listen for
     * @param handler - Callback function when double-clicked
     * 
     * @example
     * Gamepadex.onGamepadButtonDoubleClicked(ButtonFlag.AButton, function() {
     *     basic.showString("Double!")
     * })
     */
    //% block="on Gamepad | $button | double-clicked"
    //% button.defl=ButtonFlag.GreenButton
    //% group="Receiver"
    //% blockGap=8
    export function onGamepadButtonDoubleClicked(button: ButtonFlag, handler: () => void): void {
        if (!_hasClickListeners) {
            _hasClickListeners = true
            if (isListening && !_clickDetectorRunning) {
                startClickDetector()
            }
        }
        control.onEvent(GAMEPAD_BUTTON_DOUBLECLICKED_EVENT_ID, button, handler)
    }

    /**
     * Get the current packed gamepad state register (for advanced use)
     * Contains all button, joystick, and orientation data in 32-bit format
     */
    //% block="gamepad state"
    //% group="Receiver"
    //% advanced=true
    export function gamepadStatus(): uint32 {
        return _gamepadStatus
    }

    /**
     * The mode of the gamepad object on this micro:bit
     */
    //% block="operating mode"
    //% group="Receiver"
    //% advanced=true
    export function operatingMode(): OperatingMode {
        return mode
    }

    /**
     * Set the double-click time window
     * @param ms - Time window in milliseconds (100-1000)
     * 
     * @example
     * Gamepadex.setDoubleClickWindow(250)
     */
    //% block="set double-click window to $ms | ms"
    //% ms.defl=300 ms.min=100 ms.max=1000
    //% group="Advanced"
    export function setDoubleClickWindow(ms: number): void {
        _doubleClickWindowMs = Math.constrain(ms, 100, 1000)
    }

    /**
     * Set joystick deadzone threshold
     * @param value - Deadzone range (0-20, default 4)
     * 
     * @example
     * Gamepadex.setJoystickDeadzone(5)
     */
    //% block="set joystick deadzone to $value"
    //% value.defl=4 value.min=0 value.max=20
    //% group="Advanced"
    export function setJoystickDeadzone(value: number): void {
        _deadzone = Math.constrain(value, 0, 20)
    }

    /**
     * Enable or disable debug mode
     * @param enabled - True to enable debug output
     */
    //% block="set debug mode $enabled"
    //% group="Advanced"
    export function setDebugMode(enabled: boolean): void {
        _debugMode = enabled
    }
    
    /**
     * Read the pins related to buttons and pack into register of gamepad flags
     */
    function readButtons(): uint32 { 
        return (input.buttonIsPressed(Button.A) ? ButtonFlag.AButton : 0)
            | (input.buttonIsPressed(Button.B) ? ButtonFlag.BButton : 0)
            | (input.logoIsPressed() ? ButtonFlag.Logo : 0)
            | (pins.digitalReadPin(PIN_CONFIG.GREEN_BUTTON) == 0 ? ButtonFlag.GreenButton : 0)
            | (pins.digitalReadPin(PIN_CONFIG.YELLOW_BUTTON) == 0 ? ButtonFlag.YellowButton : 0)
            | (pins.digitalReadPin(PIN_CONFIG.RED_BUTTON) == 0 ? ButtonFlag.RedButton : 0)
            | (pins.digitalReadPin(PIN_CONFIG.BLUE_BUTTON) == 0 ? ButtonFlag.BlueButton : 0)
            | (pins.digitalReadPin(PIN_CONFIG.STICK_BUTTON) == 0 ? ButtonFlag.StickButton : 0)
        ; 
    }

    /**
     * Current X position of the Joystick (0-255, 128=center)
     */
    //% block="Gamepad Joystick X position"
    //% group="Receiver"
    export function joystickX(): number {
        return ((_gamepadStatus & ComponentMasks.HorizontalStick) >>> BytePositions.HorizontalStick)
    }

    /**
     * Current Y position of the Joystick (0-255, 128=center)
     */
    //% block="Gamepad Joystick Y position"
    //% group="Receiver"
    export function joystickY(): number {
        return ((_gamepadStatus & ComponentMasks.VerticalStick) >>> BytePositions.VerticalStick)
    }

    /**
     * Is button pressed on remote Gamepad
     * @param button - Button to check
     */
    //% block="is Gamepad | $button | pressed"
    //%button.defl=ButtonFlag.AButton
    //% group="Receiver"
    export function isPressed(button: ButtonFlag): boolean {
        return !!(_gamepadStatus & button)
    }

    /**
     * Is remote Gamepad currently oriented/gesturing
     * @param gesture - Gesture/orientation flag to check
     */
    //% block="is Gamepad orientated | $gesture"
    //% gesture.defl=GestureFlags.Shake
    //% group="Receiver"
    export function isOrientated(gesture: GestureFlags): boolean {
        return !!(_gamepadStatus & gesture)
    }

    /**
     * Analogue read of the horizontal joystick position
     * Centers if in dead zone, reduces fidelity to one byte
     */
    function conditionStickX(): uint32 { 
        // Analogue stick is 0 > 1023
        // shifting right twice trims the fidelity to 0 > 255
        // shifting eight bits left positions within the component ComponentMasks
        // ANDing the component mask ensures it is safely filtered
        let byteX = pins.analogReadPin(PIN_CONFIG.JOYSTICK_X) >>> 2 
        if (byteX > (128 - _deadzone) && byteX < (128 + _deadzone)) {
            byteX = 128
        }
        return (byteX << BytePositions.HorizontalStick) & ComponentMasks.HorizontalStick
    }

    /**
     * Analogue read of the vertical joystick position
     * Centers if in dead zone, reduces fidelity to one byte
     */
    function conditionStickY(): uint32 {
        // Analogue stick is 0 > 1023
        // shifting right twice trims the fidelity to 0 > 255
        // shifting sixteen bits left positions within the component ComponentMasks
        // ANDing the component mask ensures it is safely filtered
        let byteY = pins.analogReadPin(PIN_CONFIG.JOYSTICK_Y) >>> 2 
        if (byteY > (128 - _deadzone) && byteY < (128 + _deadzone)) {
            byteY = 128
        }
        return (byteY << BytePositions.VerticalStick) & ComponentMasks.VerticalStick
    }

    function readOrientation(): uint32 {
        return (
               (input.isGesture(Gesture.Shake) ? GestureFlags.Shake : 0)
            | (input.isGesture(Gesture.LogoUp) ? GestureFlags.LogoUp : 0)
            | (input.isGesture(Gesture.LogoDown) ? GestureFlags.LogoDown : 0)
            | (input.isGesture(Gesture.ScreenUp) ? GestureFlags.ScreenUp : 0)
            | (input.isGesture(Gesture.ScreenDown) ? GestureFlags.ScreenDown : 0)
            | (input.isGesture(Gesture.TiltLeft) ? GestureFlags.TiltLeft : 0)
            | (input.isGesture(Gesture.TiltRight) ? GestureFlags.TiltRight : 0)
            | ((
                   (input.isGesture(Gesture.ThreeG) ? 1 : 0)
                | (input.isGesture(Gesture.SixG) ? 1 : 0)
                | (input.isGesture(Gesture.EightG) ? 1 : 0)
                | (input.isGesture(Gesture.FreeFall) ? 1 : 0)
                ) ? GestureFlags.Falling : 0)
            ) & ComponentMasks.Orientation
        }

    function packGamepadFlags(): uint32 {
        return readButtons() | conditionStickX() | conditionStickY() | readOrientation();
    }

    /**
     * Obtain current packed gamepad flags (for advanced use)
     * 
     * @example
     * let state = Gamepadex.packedGamepadState()
     */
    //% block="packed gamepad state"
    //% group="Sender"
    export function packedGamepadState(): uint32 {
        return packGamepadFlags()
    }

    /**
     * Is button pressed on this micro:bit's gamepad
     * @param button - Button to check
     * 
     * @example
     * if (Gamepadex.isPressedLocal(ButtonFlag.AButton)) {
     *     basic.showString("A")
     * }
     */
    //% block="is | $button | pressed on this micro:bit"
    //% button.defl=ButtonFlag.AButton
    //% group="Sender"
    export function isPressedLocal(button: ButtonFlag): boolean {
        return !!(readButtons() & button)
    }
}
