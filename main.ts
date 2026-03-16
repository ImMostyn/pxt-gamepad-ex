function toBinary32 (n: number) {
    result = ""
    n = n >>> 0;
for (let i = 31; i >= 0; i--) {
        const bit = ((n >>> i) & 1) ? "1" : "0";
        result += bit;

        if (i % 8 === 0 && i !== 0) {
            result += "-";
        }
    }
return result
}
input.onButtonPressed(Button.AB, function () {
    isLogging = !(isLogging)
})
let isLogging = false
let result3 = ""
let result2 = ""
let result = ""
serial.redirectToUSB()
Gamepadex.startBroadcast(1, Frequencies.TwoFiftyHz)
Gamepadex.stopBroadcast()
basic.forever(function () {
    if (isLogging) {
        serial.writeNumber(Gamepadex.joystickY())
        serial.writeLine("" + (toBinary32(Gamepadex.getGamepadState() & (ComponentMasks.Buttons | ComponentMasks.Orientation))))
        serial.writeValue("Buttons: ", Gamepadex.getGamepadState() & ComponentMasks.Buttons)
        serial.writeValue("Stick X: ", (Gamepadex.getGamepadState() & ComponentMasks.HorizontalStick) >>> 8)
        serial.writeValue("Stick Y: ", (Gamepadex.getGamepadState() & ComponentMasks.VerticalStick) >>> 16)
        serial.writeValue("Orientation: ", (Gamepadex.getGamepadState() & ComponentMasks.Orientation) >>> 24)
    }
    if (Gamepadex.isOrientated(GestureFlags.Shake)) {
        radio.sendValue("name", 0)
        radio.sendNumber(0)
    }
    basic.pause(100)
})
