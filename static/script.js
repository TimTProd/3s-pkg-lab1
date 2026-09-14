const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const round = (value, digits = 2) => Number(value.toFixed(digits))

function rgbToXyz(rgb) {
    let values = [rgb.r, rgb.g, rgb.b].map(value => {
        value /= 255
        return value > 0.04045 ? ((value + 0.055) / 1.055) ** 2.4 : value / 12.92
    })
    let [r, g, b] = values
    return {
        x: (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100,
        y: (r * 0.2126729 + g * 0.7151522 + b * 0.072175) * 100,
        z: (r * 0.0193339 + g * 0.119192 + b * 0.9503041) * 100
    }
}

function xyzToRgb(xyz) {
    let x = xyz.x / 100
    let y = xyz.y / 100
    let z = xyz.z / 100
    let values = [
        x * 3.2404542 + y * -1.5371385 + z * -0.4985314,
        x * -0.969266 + y * 1.8760108 + z * 0.041556,
        x * 0.0556434 + y * -0.2040259 + z * 1.0572252
    ].map(value => value > 0.0031308 ? 1.055 * value ** (1 / 2.4) - 0.055 : 12.92 * value)
    let clipped = values.some(value => value < -0.00001 || value > 1.00001)
    values = values.map(value => Math.round(clamp(value, 0, 1) * 255))
    return {rgb: {r: values[0], g: values[1], b: values[2]}, clipped}
}

function rgbToHsv(rgb) {
    let r = rgb.r / 255
    let g = rgb.g / 255
    let b = rgb.b / 255
    let max = Math.max(r, g, b)
    let min = Math.min(r, g, b)
    let difference = max - min
    let h = 0

    if (difference !== 0) {
        if (max === r) h = 60 * (((g - b) / difference) % 6)
        if (max === g) h = 60 * ((b - r) / difference + 2)
        if (max === b) h = 60 * ((r - g) / difference + 4)
    }

    if (h < 0) h += 360
    return {h, s: max === 0 ? 0 : difference / max * 100, v: max * 100}
}

function hsvToRgb(hsv) {
    let h = hsv.h === 360 ? 0 : hsv.h
    let s = hsv.s / 100
    let v = hsv.v / 100
    let c = v * s
    let x = c * (1 - Math.abs((h / 60) % 2 - 1))
    let m = v - c
    let values

    if (h < 60) values = [c, x, 0]
    else if (h < 120) values = [x, c, 0]
    else if (h < 180) values = [0, c, x]
    else if (h < 240) values = [0, x, c]
    else if (h < 300) values = [x, 0, c]
    else values = [c, 0, x]

    values = values.map(value => Math.round((value + m) * 255))
    return {r: values[0], g: values[1], b: values[2]}
}

function readModel(model) {
    let result = {}
    document.querySelectorAll(`[data-model="${model}"] .component`).forEach(row => {
        let input = row.querySelector('.number')
        let value = Number(input.value)
        result[row.dataset.name] = clamp(Number.isFinite(value) ? value : 0, Number(input.min), Number(input.max))
    })
    return result
}

function setModel(model, values) {
    document.querySelectorAll(`[data-model="${model}"] .component`).forEach(row => {
        let value = values[row.dataset.name]
        let digits = model === 'rgb' ? 0 : model === 'hsv' ? 1 : 2
        row.querySelector('.number').value = round(value, digits)
        row.querySelector('.slider').value = value
    })
}

function rgbToHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    }
}

function show(rgb, message = '') {
    let hex = rgbToHex(rgb)
    setModel('rgb', rgb)
    setModel('xyz', rgbToXyz(rgb))
    setModel('hsv', rgbToHsv(rgb))
    document.querySelectorAll('.palette').forEach(input => input.value = hex)
    document.querySelector('#colorPreview').style.background = hex
    document.querySelector('#hexValue').textContent = hex.toUpperCase()
    document.querySelector('#warning').textContent = message
}

function update(model) {
    let values = readModel(model)
    let rgb
    let message = ''

    if (model === 'rgb') rgb = values
    if (model === 'hsv') rgb = hsvToRgb(values)
    if (model === 'xyz') {
        let result = xyzToRgb(values)
        rgb = result.rgb
        if (result.clipped) message = 'Часть значений вышла за диапазон RGB и была обрезана.'
    }

    show(rgb, message)
    setModel(model, values)
}

document.querySelectorAll('.component').forEach(row => {
    let number = row.querySelector('.number')
    let slider = row.querySelector('.slider')
    let model = row.closest('.model').dataset.model

    number.addEventListener('input', () => {
        slider.value = number.value
        update(model)
    })

    slider.addEventListener('input', () => {
        number.value = slider.value
        update(model)
    })
})

document.querySelectorAll('.palette').forEach(input => {
    input.addEventListener('input', () => show(hexToRgb(input.value)))
})

show({r: 79, g: 134, b: 198})
