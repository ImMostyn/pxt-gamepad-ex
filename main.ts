function toBinary32 (n: number) {
    for (let i = 31; i >= 0; i--) {
        let bit = (n >> i) & 1
        result = result + bit
    }
return result
}
input.onButtonPressed(Button.AB, function () {
    isLogging = !(isLogging)
})
let isLogging = false
let result = ""
serial.redirectToUSB()
Gamepad.startBroadcast(1, Frequencies.TwoFiftyHz)
Gamepad.stopBroadcast()
basic.forever(function () {
    if (isLogging) {
        serial.writeLine("" + (toBinary32(Gamepad.getGamepadState() & (ComponentMasks.Buttons | ComponentMasks.Orientation))))
        serial.writeValue("Buttons: ", Gamepad.getGamepadState() & ComponentMasks.Buttons)
        serial.writeValue("Stick X: ", (Gamepad.getGamepadState() & ComponentMasks.HorizontalStick) >>> 8)
        serial.writeValue("Stick Y: ", (Gamepad.getGamepadState() & ComponentMasks.VerticalStick) >>> 16)
        serial.writeValue("Orientation: ", (Gamepad.getGamepadState() & ComponentMasks.Orientation) >>> 24)
        if (Gamepad.isOrientated(GestureFlags.Shake)) {
            radio.sendValue("name", 0)
            radio.sendNumber(0)
        }
        basic.pause(100)
    }
})
