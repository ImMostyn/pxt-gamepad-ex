radio.onReceivedNumber(function (receivedNumber) {
    if (isAudible) {
        music.play(music.tonePlayable(262, music.beat(BeatFraction.Sixteenth)), music.PlaybackMode.InBackground)
    }
    basic.showIcon(IconNames.Heart)
})
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
    basic.showIcon(IconNames.Surprised)
    isLogging = !(isLogging)
    if (isLogging) {
        serial.redirectToUSB()
        basic.showIcon(IconNames.Happy)
    }
    basic.pause(2000)
    basic.clearScreen()
})
input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    if (isGamepad) {
        Gamepadex.stopBroadcast()
    } else {
        Gamepadex.stopReceiving()
    }
    if (isAudible) {
        music.play(music.builtinPlayableSoundEffect(soundExpression.yawn), music.PlaybackMode.UntilDone)
    }
    basic.showIcon(IconNames.Asleep)
})
let isLogging = false
let isGamepad = false
let isAudible = false
let result = ""
isAudible = false
isGamepad = control.deviceName() == "zeviz"
if (isGamepad) {
    basic.showIcon(IconNames.Sword)
    Gamepadex.startBroadcast(1, Frequencies.Debug)
} else {
    basic.showIcon(IconNames.Fabulous)
    Gamepadex.startReceiving(1)
}
basic.showIcon(IconNames.Yes)
basic.pause(2000)
let strip = neopixel.create(DigitalPin.P0, 30, NeoPixelMode.RGB)
strip.showRainbow(1, 360)
strip.show()
basic.pause(2000)
let isLit = true
basic.forever(function () {
    if (isLogging) {
        if (isGamepad) {
            serial.writeLine("packed gamepad state: " + toBinary32(Gamepadex.packedGamepadState()))
        } else {
            serial.writeLine("recvd state: " + toBinary32(Gamepadex.gamepadStatus()))
            serial.writeLine("Red: " + Gamepadex.isPressed(ButtonFlag.RedButton) + " Green: " + Gamepadex.isPressed(ButtonFlag.GreenButton) + " Blue: " + Gamepadex.isPressed(ButtonFlag.BlueButton) + " Yellow: " + Gamepadex.isPressed(ButtonFlag.YellowButton) + " A: " + Gamepadex.isPressed(ButtonFlag.AButton) + " B: " + Gamepadex.isPressed(ButtonFlag.BButton))
            serial.writeLine("recvd StickX: " + Gamepadex.joystickX())
            serial.writeLine("recvd StickY: " + Gamepadex.joystickY())
        }
    }
    basic.pause(500)
})
basic.forever(function () {
    if (isLit) {
        strip.clear()
        for (let index = 0; index <= 29; index++) {
            if (Math.map(index, 0, 29, 0, 255) <= Gamepadex.joystickX()) {
                strip.setPixelColor(0, neopixel.hsl(Math.map(Gamepadex.joystickY(), 0, 255, 0, 360), 100, Math.map(index, 0, 29, 10, 100)))
            }
            strip.shift(1)
        }
        strip.show()
    }
    basic.pause(100)
})