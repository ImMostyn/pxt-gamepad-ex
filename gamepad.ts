/**
* Gamepad extension
* Intended for DFRobot Gamepad to send joystick positions, 
* button states and orientation flags packed in 4 bytes of a 32 bit integer.
* All at a high frequency for a listening micro:bit to be able to consume
*/

enum OperatingMode {
    NotConfigured,
    Gamepad,
    Receiver
}

enum Frequencies {
    //% block="Slow (125 Hz)"
    OneTwentyFiveHz = 8,
    //% block="Med (167 Hz)"
    OneSixtySevenHz = 6,
    //% block="Fast (250 Hz)"
    TwoFiftyHz = 4,
    //% block="Superfly (500 Hz)"
    FiveHundredHz =2
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
 */
//% weight=100 color=#ff8000 icon="\uf11b" name="Gamepad"
namespace Gamepadex {

    let isRunning = false
    let mode = OperatingMode.NotConfigured

    let _radioGroup = 1
    let _frequency = Frequencies.TwoFiftyHz

    let _gamepadStatus = 0

    let _deadzone = 4

    /**
     * Broadcast Gamepad status
     */
    //% block="Broadcast Gamepad | on radio group $radioGroup | at $frequency"
    //% radioGroup.defl=1 radioGroup.min = 1 radioGroup.max = 255
    //% frequency.defl=Frequencies.TwoFiftyHz
    //% group="Sender"
    export function startBroadcast(radioGroup?: number, frequency?: Frequencies): void {
        if (isRunning) return

        if (mode != OperatingMode.Gamepad){
            _radioGroup = radioGroup
            _frequency = frequency

            radio.setGroup(_radioGroup)
            pins.setPull(DigitalPin.P8, PinPullMode.PullNone)
            pins.setPull(DigitalPin.P13, PinPullMode.PullNone)
            pins.setPull(DigitalPin.P14, PinPullMode.PullNone)
            pins.setPull(DigitalPin.P15, PinPullMode.PullNone)
            pins.setPull(DigitalPin.P16, PinPullMode.PullNone)

            mode = OperatingMode.Gamepad
        }

        isRunning = true

        control.inBackground(() => {
            while (isRunning) {
                console.log(getGamepadState())
                radio.sendNumber(getGamepadState())
                basic.pause(_frequency)
            }
        })
    }

    /**
     * Stop broadcasting the Gamepad status
     */
    //% block="Stop Broadcast Gamepad"
    //% group="Sender"
    export function stopBroadcast(): void {
        isRunning = false
    }

    /**
     * Receive Gamepad status messages
     */
    //% block="Receive Gamepad status | on group $radioGroup"
    //% radioGroup.defl=1 radioGroup.min = 1 radioGroup.max = 255
    //% group="Receiver"
    export function startReceiving(radioGroup?: number): void {
        if (isRunning) return

        if (mode != OperatingMode.Receiver) {
            _radioGroup = radioGroup

            radio.setGroup(_radioGroup)

            mode = OperatingMode.Receiver
        }

        isRunning = true

        radio.onReceivedNumber(function (receivedNumber: number){
            _gamepadStatus = receivedNumber
        })
    }

    /**
     * Read the pins related to buttons
     * and pack into register of gamepad flags
     */
    function readButtons(): uint32 { 
        return (input.buttonIsPressed(Button.A) ? ButtonFlag.AButton : 0)
            | (input.buttonIsPressed(Button.B) ? ButtonFlag.BButton : 0)
            | (input.logoIsPressed() ? ButtonFlag.Logo : 0)
            | (pins.digitalReadPin(DigitalPin.P13) == 0 ? ButtonFlag.GreenButton : 0)
            | (pins.digitalReadPin(DigitalPin.P14) == 0 ? ButtonFlag.YellowButton : 0)
            | (pins.digitalReadPin(DigitalPin.P15) == 0 ? ButtonFlag.RedButton : 0)
            | (pins.digitalReadPin(DigitalPin.P16) == 0 ? ButtonFlag.BlueButton : 0)
            | (pins.digitalReadPin(DigitalPin.P8) == 0 ? ButtonFlag.StickButton : 0)
        ; 
    }

    /**
     * Current X position of the Joystick
     */
    //% block="Gamepad Joystick X position"
    //% group="Receiver"
    export function joystickX(): number {
        return ((_gamepadStatus & ComponentMasks.HorizontalStick) >>> BytePositions.HorizontalStick)
    }

    /**
     * Current Y position of the Joystick
     */
    //% block="Gamepad Joystick Y position"
    //% group="Receiver"
    export function joystickY(): number {
        return ((_gamepadStatus & ComponentMasks.VerticalStick) >>> BytePositions.VerticalStick)
    }

    /**
     * Is button pressed on remote Gamepad
     */
    //% block="is Gamepad | $button | pressed"
    //%button.defl=ButtonFlag.AButton
    //% group="Receiver"
    export function isPressed(button: ButtonFlag): boolean {
        return !!(_gamepadStatus & button)
    }

    /**
     * Is remote Gamepad orientated
     */
    //% block="is Gamepad orientated | $gesture"
    //% gesture.defl=GestureFlags.Shake
    //% group="Receiver"
    export function isOrientated(gesture: GestureFlags): boolean {
        return !!(_gamepadStatus & gesture)
    }

    /**
     * Analogue read of the horizontal joystic position
     * Center if in dead zone
     * Reduce fidelity to one bytes
     * shift value one byte left
     */
    function conditionStickX(): uint32 { 
        // Analogue stick is 0 > 1023
        // shifting right twice trims the fidelity to 0 > 255
        // shifting eight bits left positions within the component ComponentMasks
        // ANDing the component mask ensures it is safely filtered
        let byteX = pins.analogReadPin(AnalogReadWritePin.P1) >>> 2 
        if (byteX > (128 - _deadzone) && byteX < (128 + _deadzone)) {
            byteX = 128
        }
        return byteX << BytePositions.HorizontalStick & ComponentMasks.HorizontalStick
        }

    /**
     * Analogue read of the vertical joystic position
     * Center if in dead zone
     * Reduce fidelity to one bytes
     * shift value two bytes left
     */
    function conditionStickY(): uint32 {
        // Analogue stick is 0 > 1023
        // shifting right twice trims the fidelity to 0 > 255
        // shifting sixteen bits left positions within the component ComponentMasks
        // ANDing the component mask ensures it is safely filtered
        let byteY = pins.analogReadPin(AnalogReadWritePin.P2) >>> 2 
        if (byteY > (128 - _deadzone) && byteY < (128 + _deadzone)) {
            byteY = 128
        }
        return byteY << BytePositions.VerticalStick & ComponentMasks.VerticalStick
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
     * Obtain current gamepad flags
     */
    //% block
    //% group="Sender"
    export function getGamepadState(): uint32 {
        // Add code here
        return packGamepadFlags()
    }

    /**
     * Is button pressed on this Gamepad
     * @param button to check for
     */
    //% block="is | $button | pressed on this micro:bit"
    //% button.defl=ButtonFlag.AButton
    //% group="Sender"
    export function isPressedLocal(button: ButtonFlag): boolean {
        return !!(readButtons() & button)
    }
}
