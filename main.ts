function toBinary32 (n: number) : string {
    let result = ""

    n = n >>> 0
    
    for (let i = 31; i >= 0; i--) {
        let bit = ((n >> i) & 1) > 0 ? "1" : "0" 
        result = result + bit
        if (i % 8 == 0 && i != 0) {
            result = result + "-"
        }
    }
return result
}
input.onButtonPressed(Button.AB, function () {
    isLogging = !(isLogging)
})
let isLogging = false
let result = ""
serial.redirectToUSB()
Gamepadex.startBroadcast(1, Frequencies.TwoFiftyHz)
Gamepadex.stopBroadcast()
basic.forever(function () {
    if (isLogging) {
        serial.writeLine(" " + (toBinary32(Gamepadex.getGamepadState() & (ComponentMasks.Buttons | ComponentMasks.Orientation))))
        serial.writeValue("Buttons: ", Gamepadex.getGamepadState() & ComponentMasks.Buttons)
        serial.writeValue("Stick X: ", (Gamepadex.getGamepadState() & ComponentMasks.HorizontalStick) >>> 8)
        serial.writeValue("Stick Y: ", (Gamepadex.getGamepadState() & ComponentMasks.VerticalStick) >>> 16)
        serial.writeValue("Orientation: ", (Gamepadex.getGamepadState() & ComponentMasks.Orientation) >>> 24)
        if (Gamepadex.isOrientated(GestureFlags.Shake)) {
            radio.sendValue("name", 0)
            radio.sendNumber(0)
        }
        basic.pause(100)
    }
})
